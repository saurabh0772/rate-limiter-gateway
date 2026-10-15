const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const RequestLog = require('../models/RequestLog');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
let luaScript = '';
try {
  luaScript = fs.readFileSync(path.join(__dirname, '../lua/rateLimiter.lua'), 'utf8');
} catch (e) {
  console.log('Lua load failed, using simple counter');
}

// Non-blocking fire-and-forget log function
function logRequest({ apiKeyDoc, req, status, statusCode, responseTimeMs }) {
  setImmediate(async () => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const userAgent = (req.headers['user-agent'] || '').substring(0, 200);
      const reqPath = req.originalUrl || req.path || '/';

      await RequestLog.create({
        apiKey: apiKeyDoc._id,
        user: apiKeyDoc.user?._id || apiKeyDoc.user,
        path: reqPath,
        method: req.method || 'GET',
        status,
        statusCode: statusCode || (status === 'blocked' ? 429 : 200),
        ip: clientIp,
        userAgent,
        responseTimeMs: Math.max(0, Math.round(responseTimeMs || 0)),
        timestamp: new Date()
      });

      await ApiKey.findByIdAndUpdate(apiKeyDoc._id, {
        $inc: {
          totalRequests: 1,
          ...(status === 'blocked' ? { blockedRequests: 1 } : {})
        },
        lastUsedAt: new Date()
      }).exec();
    } catch (e) {
      console.error('Log error:', e.message);
    }
  });
}

const rateLimitMiddleware = async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/health') || req.path.startsWith('/webhooks') || req.path.startsWith('/api/check')) {
    return next();
  }

  const start = Date.now();
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) {
    return res.status(401).json({ error: 'API Key missing - add x-api-key header' });
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyDoc = await ApiKey.findOne({ keyHash, isActive: true }).populate('user');
  if (!keyDoc) {
    return res.status(403).json({ error: 'Invalid or revoked API Key' });
  }

  req.keyData = keyDoc;

  try {
    if (luaScript) {
      const redisKey = `ratelimit:${keyDoc._id}`;
      const windowSec = keyDoc.windowSec || 60;
      const limit = keyDoc.limit;
      const result = await redis.eval(luaScript, 1, redisKey, windowSec.toString(), limit.toString());
      const [allowed, count] = Array.isArray(result) ? result : [result, 1];
      
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

      if (allowed === 0) {
        // Rate limited: log immediately (non-blocking) and return 429
        logRequest({
          apiKeyDoc: keyDoc,
          req,
          status: 'blocked',
          statusCode: 429,
          responseTimeMs: Date.now() - start
        });
        return res.status(429).json({ error: 'Rate limit exceeded', limit, current: count });
      }
    }
  } catch (e) {
    console.error('Redis rate limit error', e.message);
  }

  // Request allowed: capture finish event to log downstream status and response time
  let logged = false;
  const onComplete = () => {
    if (logged) return;
    logged = true;
    const responseTimeMs = Date.now() - start;
    logRequest({
      apiKeyDoc: keyDoc,
      req,
      status: 'allowed',
      statusCode: res.statusCode || 200,
      responseTimeMs
    });
  };

  res.once('finish', onComplete);
  res.once('close', onComplete);

  next();
};

module.exports = rateLimitMiddleware;
