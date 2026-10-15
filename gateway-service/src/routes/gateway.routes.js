const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');
const { redisClient } = require('../../lib/redis');
const ApiKey = require('../../models/ApiKey');
const RequestLog = require('../../models/RequestLog');

const router = express.Router();

// Ensure CORS allows all origins for /api/check endpoint
const corsOptions = {
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

router.use(cors(corsOptions));

// POST /api/check - Fast SDK Rate Limit Check (<20ms)
router.post(['/check', '/api/check'], async (req, res) => {
  const start = Date.now();
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
    return res.status(401).json({ allowed: false, error: 'API key is required' });
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
        return res.status(401).json({ allowed: false });
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

    // 4. Rate Limiting Logic: GET count, if >= limit -> 429
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

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
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

    const remaining = Math.max(0, limit - count - 1);
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

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    return res.status(200).json({
      allowed: true,
      remaining,
      limit
    });
  } catch (err) {
    console.error('Check endpoint error:', err);
    return res.status(500).json({ allowed: false, error: 'Internal server error' });
  }
});

module.exports = router;
