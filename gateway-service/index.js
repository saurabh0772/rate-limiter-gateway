const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const ApiKey = require('./models/ApiKey');

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL);
const luaScript = fs.readFileSync('./lua/rateLimiter.lua', 'utf8');
const DOWNSTREAM_URL = process.env.DOWNSTREAM_URL;

// Mongo Connect
mongoose.connect(process.env.MONGO_URL).then(async () => {
    console.log('Mongo Connected');
    // Demo ke liye 2 keys bana dete hai agar nahi hai
    const count = await ApiKey.countDocuments();
    if (count === 0) {
        await ApiKey.create([
            { key: 'free_a1b2c3d4e5', tier: 'free', limit: 10, owner: 'test-free-user' },
            { key: 'pro_xyz999', tier: 'pro', limit: 100, owner: 'test-pro-user' }
        ]);
        console.log('Demo API Keys Created');
    }
});

// 1. Dashboard ke liye API - Key banane ke liye
app.post('/admin/create-key', async (req, res) => {
    const { tier, owner } = req.body;
    const limit = tier === 'pro' ? 100 : 10;
    const key = `${tier}_${Math.random().toString(36).substring(2, 12)}`;
    const newKey = await ApiKey.create({ key, tier, limit, owner });
    res.json(newKey);
});

app.get('/admin/keys', async (req, res) => {
    const keys = await ApiKey.find();
    res.json(keys);
});

// 2. Main Gateway Middleware - Har request yaha se guzregi
app.use(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API Key missing. Send x-api-key header' });

    // Step A: Mongo se tier nikalo (Real project me isko Redis me cache karte hai)
    const keyData = await ApiKey.findOne({ key: apiKey });
    if (!keyData) return res.status(403).json({ error: 'Invalid API Key' });

    // Step B: Redis me Lua Script se limit check karo
    const redisKey = `ratelimit:${apiKey}`;
    const result = await redis.eval(luaScript, 1, redisKey, 60, keyData.limit);

    if (result === 0) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            tier: keyData.tier,
            limit: keyData.limit
        });
    }

    // Allowed
    res.setHeader('X-RateLimit-Limit', keyData.limit);
    next();
});

// 3. Proxy to Dummy Service
app.use('/', createProxyMiddleware({
    target: DOWNSTREAM_URL,
    changeOrigin: true
}));

app.listen(3000, () => console.log('Gateway running on 3000'));