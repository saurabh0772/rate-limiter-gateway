const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiKeySchema = new mongoose.Schema({
    // Hashed key for security - plain key sirf ek baar dikhega
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true }, // e.g. live_abc123 -> logs me dikhane ke liye, pura key nahi
    // Reference - yehi production way hai, string nahi
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true }, // "My Production Key"
    downstreamUrl: { type: String, required: true, trim: true },
    // Custom limit - 1 to 20000
    limit: {
        type: Number,
        required: true,
        min: 1,
        max: 20000,
        default: 100,
        validate: { validator: Number.isInteger, message: 'Limit must be integer' }
    },
    windowSec: { type: Number, default: 60 }, // future: per-API window
    // Status
    isActive: { type: Boolean, default: true, index: true },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
    // Analytics counters - denormalized for fast dashboard
    totalRequests: { type: Number, default: 0 },
    blockedRequests: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for fast per-user lookup
ApiKeySchema.index({ user: 1, isActive: 1, createdAt: -1 });

ApiKeySchema.methods.isLimitExceeded = function () { return false; };

module.exports = mongoose.model('ApiKey', ApiKeySchema);