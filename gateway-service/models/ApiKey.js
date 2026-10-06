const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // free_abc123
    tier: { type: String, enum: ['free', 'pro'], default: 'free' },
    limit: { type: Number, default: 100 }, // free=100, pro=10000
    owner: String
});

module.exports = mongoose.model('ApiKey', ApiKeySchema);