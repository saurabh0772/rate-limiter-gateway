const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const { attachUser } = require('../middlewares/auth');
const ApiKey = require('../models/ApiKey');
const RequestLog = require('../models/RequestLog');
const crypto = require('crypto');
const Redis = require('ioredis');

// Connect redis for analytics caching
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false
});
redis.on('error', (e) => {
    // Suppress unhandled redis log spam in admin routes
});

// All admin routes need Clerk auth + DB user attach
router.use(ClerkExpressWithAuth());
router.use(ClerkExpressRequireAuth());
router.use(attachUser);

// GET /admin/keys - Fetch only logged-in user's active keys
router.get('/keys', async (req, res) => {
    try {
        const keys = await ApiKey.find({ user: req.user._id, isActive: { $ne: false } })
            .select('-keyHash')
            .sort({ createdAt: -1 });
        res.json(keys);
    } catch (e) {
        console.error('Fetch keys error:', e);
        res.status(500).json({ error: 'Failed to fetch keys' });
    }
});

// POST /admin/create-key - Production Ready
router.post('/create-key', async (req, res) => {
    try {
        const { name, downstreamUrl, limit } = req.body;

        // Validation
        if (!name || !downstreamUrl) {
            return res.status(400).json({ error: 'name and downstreamUrl required' });
        }

        const trimmedUrl = downstreamUrl.trim();
        if (!trimmedUrl.startsWith('https://')) {
            return res.status(400).json({ error: 'downstreamUrl must start with https://' });
        }

        const parsedLimit = parseInt(limit, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20000) {
            return res.status(400).json({ error: 'limit must be between 1 and 20000' });
        }

        // Check max keys per user
        const maxKeys = req.user.maxKeysAllowed || 3;
        const count = await ApiKey.countDocuments({ user: req.user._id, isActive: { $ne: false } });
        if (count >= maxKeys) {
            return res.status(403).json({ error: `Max ${maxKeys} keys allowed on ${req.user.plan || 'free'} plan` });
        }

        // Generate secure key
        const rawKey = `live_${crypto.randomBytes(16).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12);

        const apiKeyDoc = await ApiKey.create({
            keyHash,
            keyPrefix,
            user: req.user._id,
            name: name.trim(),
            downstreamUrl: trimmedUrl.replace(/\/$/, ''),
            limit: parsedLimit,
            isActive: true
        });

        // IMPORTANT: rawKey is only returned once upon creation
        res.json({
            _id: apiKeyDoc._id,
            key: rawKey,
            keyPrefix,
            name: apiKeyDoc.name,
            limit: apiKeyDoc.limit,
            downstreamUrl: apiKeyDoc.downstreamUrl,
            createdAt: apiKeyDoc.createdAt,
            message: 'Copy this key now, you will not see it again'
        });
    } catch (e) {
        console.error('Create key error:', e);
        res.status(500).json({ error: e.message || 'Failed to create key' });
    }
});

// DELETE /admin/keys/:id - Soft delete only user's own keys
router.delete('/keys/:id', async (req, res) => {
    try {
        const key = await ApiKey.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isActive: false, revokedAt: new Date() },
            { new: true }
        );
        if (!key) {
            return res.status(404).json({ error: 'Key not found or unauthorized' });
        }
        res.json({ success: true, message: 'Key revoked successfully' });
    } catch (e) {
        console.error('Delete key error:', e);
        res.status(500).json({ error: e.message || 'Failed to delete key' });
    }
});

// ==========================================
// ANALYTICS & ANOMALY DETECTION ENDPOINTS
// ==========================================

// A) GET /admin/analytics/summary
// Query: ?period=24h (default), 7d, 30d
router.get('/analytics/summary', async (req, res) => {
    try {
        const period = req.query.period || '24h';
        const now = Date.now();
        let ms = 24 * 60 * 60 * 1000;
        if (period === '7d') ms = 7 * 24 * 60 * 60 * 1000;
        if (period === '30d') ms = 30 * 24 * 60 * 60 * 1000;

        const startDate = new Date(now - ms);
        const userId = req.user._id;

        const [summaryAgg, requestsLastHour, activeKeys, topPaths] = await Promise.all([
            RequestLog.aggregate([
                { $match: { user: userId, timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
                        avgResponseTime: { $avg: '$responseTimeMs' }
                    }
                }
            ]),
            RequestLog.countDocuments({
                user: userId,
                timestamp: { $gte: new Date(now - 60 * 60 * 1000) }
            }),
            ApiKey.countDocuments({
                user: userId,
                isActive: { $ne: false }
            }),
            RequestLog.aggregate([
                { $match: { user: userId, timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: '$path',
                        total: { $sum: 1 },
                        blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } }
                    }
                },
                { $sort: { total: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        _id: 0,
                        path: '$_id',
                        total: 1,
                        blocked: 1
                    }
                }
            ])
        ]);

        const total = summaryAgg[0]?.total || 0;
        const blocked = summaryAgg[0]?.blocked || 0;
        const allowed = Math.max(0, total - blocked);
        const successRate = total > 0 ? Number(((allowed / total) * 100).toFixed(1)) : 100;
        const avgResponseTime = Math.round(summaryAgg[0]?.avgResponseTime || 0);

        res.json({
            total,
            blocked,
            allowed,
            successRate,
            requestsLastHour,
            avgResponseTime,
            activeKeys,
            topPaths
        });
    } catch (e) {
        console.error('Analytics summary error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch analytics summary' });
    }
});

// B) GET /admin/analytics/timeseries
// Query: ?period=24h (default), 7d, 30d
router.get('/analytics/timeseries', async (req, res) => {
    try {
        const period = req.query.period || '24h';
        const now = Date.now();
        let ms = 24 * 60 * 60 * 1000;
        if (period === '7d') ms = 7 * 24 * 60 * 60 * 1000;
        if (period === '30d') ms = 30 * 24 * 60 * 60 * 1000;

        const startDate = new Date(now - ms);
        const userId = req.user._id;

        const agg = await RequestLog.aggregate([
            { $match: { user: userId, timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: period === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                            date: '$timestamp'
                        }
                    },
                    allowed: { $sum: { $cond: [{ $eq: ['$status', 'allowed'] }, 1, 0] } },
                    blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            }
        ]);

        const aggMap = new Map();
        agg.forEach(item => aggMap.set(item._id, item));

        const timeseries = [];
        if (period === '24h') {
            // Generate 24 continuous 1-hour slots
            for (let i = 23; i >= 0; i--) {
                const d = new Date(now - i * 60 * 60 * 1000);
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                const hour = String(d.getUTCHours()).padStart(2, '0');
                const key = `${year}-${month}-${day} ${hour}:00`;
                const entry = aggMap.get(key) || { allowed: 0, blocked: 0, total: 0 };
                
                // Format label for display (e.g. 14:00)
                const localHourStr = `${hour}:00`;

                timeseries.push({
                    time: localHourStr,
                    rawTime: key,
                    allowed: entry.allowed,
                    blocked: entry.blocked,
                    total: entry.total
                });
            }
        } else {
            // 7d or 30d: daily buckets
            const daysCount = period === '7d' ? 7 : 30;
            for (let i = daysCount - 1; i >= 0; i--) {
                const d = new Date(now - i * 24 * 60 * 60 * 1000);
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                const key = `${year}-${month}-${day}`;
                const entry = aggMap.get(key) || { allowed: 0, blocked: 0, total: 0 };

                timeseries.push({
                    time: `${month}/${day}`,
                    rawTime: key,
                    allowed: entry.allowed,
                    blocked: entry.blocked,
                    total: entry.total
                });
            }
        }

        res.json(timeseries);
    } catch (e) {
        console.error('Analytics timeseries error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch analytics timeseries' });
    }
});

// C) GET /admin/analytics/logs
// Query: ?limit=50&status=all&apiKeyId=optional&search=optional
router.get('/analytics/logs', async (req, res) => {
    try {
        const query = { user: req.user._id };
        if (req.query.status && ['allowed', 'blocked'].includes(req.query.status)) {
            query.status = req.query.status;
        }
        if (req.query.apiKeyId) {
            query.apiKey = req.query.apiKeyId;
        }
        if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
            query.path = { $regex: req.query.search.trim(), $options: 'i' };
        }

        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const logs = await RequestLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('apiKey', 'keyPrefix name')
            .lean();

        const formatted = logs.map(l => ({
            _id: l._id,
            path: l.path,
            method: l.method,
            status: l.status,
            statusCode: l.statusCode,
            ip: l.ip || '127.0.0.1',
            timestamp: l.timestamp,
            responseTimeMs: l.responseTimeMs,
            apiKeyName: l.apiKey?.name || 'Revoked / Deleted Key',
            apiKeyPrefix: l.apiKey?.keyPrefix || ''
        }));

        res.json(formatted);
    } catch (e) {
        console.error('Analytics logs error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch logs' });
    }
});

// D) GET /admin/analytics/anomalies
// Main anomaly detection with 30s Redis cache
router.get('/analytics/anomalies', async (req, res) => {
    try {
        const userId = req.user._id;
        const cacheKey = `anomalies:${userId}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        } catch (cacheErr) {}

        const now = new Date();
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [
            totalLastMin,
            blockedLastMin,
            totalLast5Min,
            topBlockedPathAgg,
            topIPAgg
        ] = await Promise.all([
            RequestLog.countDocuments({ user: userId, timestamp: { $gte: oneMinAgo } }),
            RequestLog.countDocuments({ user: userId, status: 'blocked', timestamp: { $gte: oneMinAgo } }),
            RequestLog.countDocuments({ user: userId, timestamp: { $gte: fiveMinAgo } }),
            RequestLog.aggregate([
                { $match: { user: userId, status: 'blocked', timestamp: { $gte: fiveMinAgo } } },
                { $group: { _id: '$path', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]),
            RequestLog.aggregate([
                { $match: { user: userId, status: 'blocked', timestamp: { $gte: fiveMinAgo } } },
                { $group: { _id: '$ip', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ])
        ]);

        const blockedRatio = totalLastMin > 0 ? (blockedLastMin / totalLastMin) : 0;
        const topBlockedPath = topBlockedPathAgg[0]?._id || '/';
        const topBlockedCount = topBlockedPathAgg[0]?.count || 0;
        const topIP = topIPAgg[0]?._id || 'unknown';
        const topIPBlockedCount = topIPAgg[0]?.count || 0;

        const anomalies = [];
        const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        // Condition 1: Traffic spike
        if (totalLastMin > 1000) {
            anomalies.push({
                type: 'spike',
                severity: 'high',
                message: `Traffic spike: ${totalLastMin.toLocaleString()} req in last 1 min at ${timeStr}`,
                timestamp: now,
                path: topBlockedPath,
                ip: topIP
            });
        }

        // Condition 2: High abuse
        if (blockedLastMin > 100) {
            anomalies.push({
                type: 'abuse',
                severity: 'high',
                message: `High abuse: ${blockedLastMin.toLocaleString()} requests blocked in last 1 min on ${topBlockedPath}`,
                timestamp: now,
                path: topBlockedPath,
                ip: topIP
            });
        }

        // Condition 3: Rate limit abuse
        if (blockedRatio > 0.5 && totalLastMin > 20) {
            anomalies.push({
                type: 'rate_limit_abuse',
                severity: 'medium',
                message: `${Math.round(blockedRatio * 100)}% requests are being rate limited - clients hitting limits`,
                timestamp: now,
                path: topBlockedPath,
                ip: topIP
            });
        }

        // Condition 4: Brute force
        if (topIPBlockedCount > 200 && topIP !== 'unknown') {
            anomalies.push({
                type: 'brute_force',
                severity: 'high',
                message: `Potential brute force from IP ${topIP} - ${topIPBlockedCount.toLocaleString()} blocked on ${topBlockedPath}`,
                timestamp: now,
                path: topBlockedPath,
                ip: topIP
            });
        }

        const responsePayload = {
            hasAnomaly: anomalies.length > 0,
            anomalies
        };

        try {
            await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 30);
        } catch (e) {}

        res.json(responsePayload);
    } catch (e) {
        console.error('Analytics anomalies error:', e);
        res.status(500).json({ error: e.message || 'Failed to detect anomalies' });
    }
});

// 404 handler for unmatched admin routes
router.use((req, res) => {
    res.status(404).json({ error: `Admin endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Admin error handler
router.use((err, req, res, next) => {
    if (err && (err.message === 'Unauthenticated' || err.status === 401 || err.statusCode === 401)) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }
    console.error('Admin route unhandled error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = router;
