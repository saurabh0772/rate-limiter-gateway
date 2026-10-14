const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const { attachUser } = require('../middlewares/auth');
const ApiKey = require('../models/ApiKey');
const crypto = require('crypto');

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
        const rawKey = `live_${crypto.randomBytes(16).toString('hex')}`; // e.g. live_a1b2c3...
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12); // safe for logs/display

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
        res.status(500).json({ error: 'Failed to create key' });
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
        res.status(500).json({ error: 'Failed to delete key' });
    }
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
