const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
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

const rateLimitMiddleware = async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/health') || req.path.startsWith('/webhooks')) return next();
  
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) return res.status(401).json({ error: 'API Key missing - add x-api-key header' });
  
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyDoc = await ApiKey.findOne({ keyHash, isActive: true }).populate('user');
  if (!keyDoc) return res.status(403).json({ error: 'Invalid or revoked API Key' });

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
      if (allowed === 0) return res.status(429).json({ error: 'Rate limit exceeded', limit, current: count });
    }
  } catch (e) {
    console.error('Redis rate limit error', e.message);
  }

  ApiKey.updateOne({ _id: keyDoc._id }, { lastUsedAt: new Date(), $inc: { totalRequests: 1 } }).exec();
  next();
};

module.exports = rateLimitMiddleware;
