require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

require('./models/User');
require('./models/ApiKey');
require('./models/RequestLog');

const adminRoutes = require('./routes/admin');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        try {
            const url = new URL(origin);
            if (url.hostname.endsWith('.vercel.app')) {
                return cb(null, true);
            }
        } catch (e) {}
        cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
});
redis.on('connect', () => console.log('✅ Redis Connected'));
redis.on('error', (e) => console.error('❌ Redis Error', e.message));

const luaPath = path.join(__dirname, './lua/rateLimiter.lua');
let luaScript = '';
try { luaScript = fs.readFileSync(luaPath, 'utf8'); } catch(e){ console.log('Lua not found, using memory fallback'); }

mongoose.connect(process.env.MONGO_URL)
    .then(async () => {
        console.log('✅ Mongo Connected');
        try {
            const ApiKey = mongoose.model('ApiKey');
            const indexes = await ApiKey.collection.indexes();
            if (indexes.some(idx => idx.name === 'key_1')) {
                await ApiKey.collection.dropIndex('key_1');
                console.log('✅ Dropped legacy key_1 unique index');
            }
        } catch (e) {
            // Ignore if index doesn't exist or collection is empty
        }
    })
    .catch(e => console.error('❌ Mongo Error', e.message));

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/admin', adminRoutes);

// Data plane
app.use(rateLimitMiddleware);

app.use('/', async (req, res) => {
    if (!req.keyData) return res.status(500).json({ error: 'Key data missing' });
    try {
        const targetUrl = req.keyData.downstreamUrl + req.originalUrl;
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: { ...req.headers, host: undefined, 'x-api-key': undefined },
            validateStatus: () => true
        });
        for (const [k,v] of Object.entries(response.headers)) {
            if (!['content-encoding','content-length','transfer-encoding'].includes(k)) res.setHeader(k,v);
        }
        res.status(response.status).send(response.data);
    } catch (e) {
        console.error('Proxy error', e.message);
        res.status(502).json({ error: 'Downstream error' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    if (err && (err.message === 'Unauthenticated' || err.status === 401 || err.statusCode === 401)) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }
    console.error('Unhandled server error:', err);
    res.status(err.status || err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`🚀 Gateway running on ${PORT}`));
