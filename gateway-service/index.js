const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const ApiKey = require('./models/ApiKey');

const app = express();
app.use(express.json());

// FIX 1: PORT env se lo, Render 10000 deta hai, local pe 3000
const PORT = process.env.PORT || 3000;

// FIX 2: Redis error handle karo warna deploy pe crash
const redis = new Redis(process.env.REDIS_URL);
redis.on('connect', () => console.log('Redis Connected'));
redis.on('error', (err) => console.error('Redis Error:', err.message));

const luaScript = fs.readFileSync('./lua/rateLimiter.lua', 'utf8');

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Mongo Connected'))
    .catch(err => console.error('Mongo Error:', err.message));

// CORS - OPTIONS handle karna must hai warna Vercel se call fail hogi
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Admin APIs
app.post('/admin/create-key', async (req, res) => {
    let { tier, owner, downstreamUrl } = req.body;
    if (!downstreamUrl) return res.status(400).json({ error: 'downstreamUrl required. Eg: https://api.rohit.com' });

    // FIX 3: URL ko clean karo - https://api.rohit.com/ -> https://api.rohit.com
    downstreamUrl = downstreamUrl.trim().replace(/\/$/, '');

    try {
        new URL(downstreamUrl); // valid URL check
    } catch {
        return res.status(400).json({ error: 'Invalid downstreamUrl. Must start with https://' });
    }

    const limit = tier === 'pro' ? 100 : 10;
    const key = `${tier}_${Math.random().toString(36).substring(2, 12)}`;
    try {
        const newKey = await ApiKey.create({ key, tier, limit, owner, downstreamUrl });
        res.json(newKey);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/admin/keys', async (req, res) => {
    try {
        const keys = await ApiKey.find().sort({ createdAt: -1 });
        res.json(keys);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Gateway Middleware
app.use(async (req, res, next) => {
    if (req.path.startsWith('/admin') || req.path.startsWith('/health')) return next();

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API Key missing. Send x-api-key header' });

    try {
        const keyData = await ApiKey.findOne({ key: apiKey });
        if (!keyData) return res.status(403).json({ error: 'Invalid API Key' });

        const redisKey = `ratelimit:${apiKey}`;
        const result = await redis.eval(luaScript, 1, redisKey, 60, keyData.limit);

        if (result === 0) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                tier: keyData.tier,
                limit: keyData.limit,
                retryAfter: 60
            });
        }

        res.setHeader('X-RateLimit-Limit', keyData.limit);
        res.setHeader('X-RateLimit-Remaining', keyData.limit - (await redis.get(redisKey) || 0));
        req.keyData = keyData;
        next();
    } catch (e) {
        console.error('Middleware error', e);
        res.status(500).json({ error: 'Gateway error' });
    }
});

// Dynamic Proxy
app.use('/', (req, res, next) => {
    if (!req.keyData) return res.status(404).json({ error: 'Not found' });

    const target = req.keyData.downstreamUrl;
    console.log(`Proxying ${req.keyData.key} -> ${target}${req.originalUrl}`);

    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        logLevel: 'silent',
        selfHandleResponse: false,
        on: {
            error: (err, req, res) => {
                console.error('Proxy Error:', err.message);
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Bad Gateway - downstream unreachable', target });
                }
            }
        }
    })(req, res, next);
});

app.listen(PORT, () => console.log(`SaaS Gateway running on ${PORT}`));