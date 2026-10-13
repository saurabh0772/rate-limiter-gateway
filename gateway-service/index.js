const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const ApiKey = require('./models/ApiKey');

const app = express();
app.use(cors({ origin: (o, cb) => cb(null, o || true), credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const redis = new Redis(process.env.REDIS_URL);
redis.on('connect', () => console.log('Redis Connected'));
redis.on('error', (e) => console.error('Redis Error', e.message));

const luaScript = fs.readFileSync('./lua/rateLimiter.lua', 'utf8');

mongoose.connect(process.env.MONGO_URL).then(() => console.log('Mongo Connected'));

app.post('/admin/create-key', async (req, res) => {
    let { tier, owner, downstreamUrl } = req.body;
    if (!downstreamUrl) return res.status(400).json({ error: 'downstreamUrl required' });
    downstreamUrl = downstreamUrl.trim().replace(/\/$/, '');
    const limit = tier === 'pro' ? 100 : 10; // FIXED: yahi pe 10/100 decide hoga
    const key = `${tier}_${Math.random().toString(36).substring(2, 12)}`;
    const newKey = await ApiKey.create({ key, tier, limit, owner, downstreamUrl });
    res.json(newKey);
});

app.get('/admin/keys', async (req, res) => {
    const keys = await ApiKey.find().sort({ createdAt: -1 });
    res.json(keys);
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.path.startsWith('/admin') || req.path.startsWith('/health')) return next();
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API Key missing' });
    const keyData = await ApiKey.findOne({ key: apiKey });
    console.log('KEY:', apiKey, 'DB limit:', keyData.limit, 'tier:', keyData.tier);
    if (!keyData) return res.status(403).json({ error: 'Invalid API Key' });

    let limitToUse = keyData.limit; // DB se lega
    if (req.path.startsWith('/auth')) limitToUse = Math.max(keyData.limit, 100);
    console.log('limitToUse for', req.path, ':', limitToUse);

    const redisKey = `ratelimit:${apiKey}:${req.path.startsWith('/auth') ? 'auth' : 'api'}`;
    const result = await redis.eval(luaScript, 1, redisKey, 60, limitToUse);
    if (result === 0) return res.status(429).json({ error: 'Rate limit exceeded', limit: limitToUse, retryAfter: 60 });

    req.keyData = keyData;
    next();
});

app.use('/', (req, res, next) => {
    const target = req.keyData.downstreamUrl;
    console.log(`Proxying ${req.keyData.key} -> ${target}${req.originalUrl}`);
    return createProxyMiddleware({ target, changeOrigin: true, logLevel: 'silent' })(req, res, next);
});

app.listen(PORT, () => console.log(`Gateway on ${PORT}`));