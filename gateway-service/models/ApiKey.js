const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    tier: { type: String, enum: ['free', 'pro'], default: 'free' },
    limit: { type: Number, default: 10 },
    owner: { type: String, required: true }, // Developer ka naam/email
    downstreamUrl: { type: String, required: true }, // YE SABSE IMPORTANT - Customer ka backend URL
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiKey', ApiKeySchema);