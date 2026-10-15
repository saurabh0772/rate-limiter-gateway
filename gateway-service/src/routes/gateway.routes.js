const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');
const { redisClient } = require('../../lib/redis');
const ApiKey = require('../../models/ApiKey');
const RequestLog = require('../../models/RequestLog');

const router = express.Router();

// CORS configuration to allow all origins for /api/check
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

router.use(cors(corsOptions));

// Handle preflight OPTIONS requests for check endpoint
router.options(['/check', '/api/check'], cors(corsOptions), (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  return res.sendStatus(204);
});

// POST /api/check - Fast SDK Rate Limit Check (<20ms)
router.post(['/check', '/api/check'], cors(corsOptions), async (req, res) => {
  const start = Date.now();

  // Ensure CORS header on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  const apiKey = req.body?.apiKey || req.headers['x-api-key'];
  const ip = (
    req.body?.ip ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  )
    .split(',')[0]
    .trim();
  const path = req.body?.path || '/';

  // 1. Validate API Key Presence
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({
      error: 'Invalid API Key',
      allowed: false
    });
  }

  try {
    // 2. Hash the apiKey with sha256 (same as existing verify)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Fast-path cached key lookup
    const cacheKey = `apikey:${keyHash}`;
    let keyData = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        keyData = JSON.parse(cached);
      }
    } catch (cacheErr) {
      // Fallback to DB
    }

    if (!keyData) {
      const apiKeyDoc = await ApiKey.findOne({ keyHash, isActive: { $ne: false } });
      if (!apiKeyDoc) {
        return res.status(401).json({
          error: 'Invalid API Key',
          allowed: false
        });
      }
      keyData = {
        _id: apiKeyDoc._id.toString(),
        user: (apiKeyDoc.user?._id || apiKeyDoc.user).toString(),
        limit: apiKeyDoc.limit || apiKeyDoc.requestsPerMinute || 100,
        windowSec: apiKeyDoc.windowSec || 60
      };
      try {
        await redisClient.set(cacheKey, JSON.stringify(keyData), 'EX', 300);
      } catch (setCacheErr) {}
    }

    const keyId = keyData._id;
    const limit = keyData.limit;
    const windowSec = keyData.windowSec || 60;

    // 3. Redis key = check:${keyId}:${ip}:${path}
    const redisKey = `check:${keyId}:${ip}:${path}`;

    // 4. Rate Limiting Logic: GET count, if >= limit -> return 429
    let countVal = await redisClient.get(redisKey);
    const count = countVal ? parseInt(countVal, 10) : 0;

    if (count >= limit) {
      const responseTime = Date.now() - start;

      // Async log to RequestLog table for analytics (do not await)
      setImmediate(async () => {
        try {
          await RequestLog.create({
            apiKey: new mongoose.Types.ObjectId(keyId),
            user: new mongoose.Types.ObjectId(keyData.user),
            path,
            method: 'CHECK',
            status: 'blocked',
            statusCode: 429,
            ip,
            userAgent: 'sdk-check',
            responseTimeMs: Math.max(0, responseTime),
            timestamp: new Date()
          });

          await ApiKey.findByIdAndUpdate(keyId, {
            $inc: { totalRequests: 1, blockedRequests: 1 },
            lastUsedAt: new Date()
          }).exec();
        } catch (logErr) {
          console.error('Async SDK check log error:', logErr.message);
        }
      });

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');

      // MUST return HTTP 429 when rate limited
      return res.status(429).json({
        error: 'Too Many Requests',
        allowed: false,
        remaining: 0,
        limit
      });
    }

    // Else INCR, EXPIRE window (60 sec)
    const newCount = await redisClient.incr(redisKey);
    if (newCount === 1) {
      await redisClient.expire(redisKey, windowSec);
    }

    const remainingCount = Math.max(0, limit - count - 1);
    const responseTime = Date.now() - start;

    // Async log to RequestLog table for analytics (do not await)
    setImmediate(async () => {
      try {
        await RequestLog.create({
          apiKey: new mongoose.Types.ObjectId(keyId),
          user: new mongoose.Types.ObjectId(keyData.user),
          path,
          method: 'CHECK',
          status: 'allowed',
          statusCode: 200,
          ip,
          userAgent: 'sdk-check',
          responseTimeMs: Math.max(0, responseTime),
          timestamp: new Date()
        });

        await ApiKey.findByIdAndUpdate(keyId, {
          $inc: { totalRequests: 1 },
          lastUsedAt: new Date()
        }).exec();
      } catch (logErr) {
        console.error('Async SDK check log error:', logErr.message);
      }
    });

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remainingCount.toString());

    // MUST return HTTP 200 when allowed
    return res.status(200).json({
      allowed: true,
      remaining: remainingCount,
      limit
    });
  } catch (err) {
    console.error('Check endpoint error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      allowed: false
    });
  }
});

module.exports = router;
