const mongoose = require('mongoose');

const RequestLogSchema = new mongoose.Schema({
  apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  path: { type: String, required: true },
  method: { type: String, default: 'GET' },
  status: { type: String, enum: ['allowed', 'blocked'], required: true, index: true },
  statusCode: { type: Number, default: 200 },
  ip: { type: String, default: '127.0.0.1' },
  userAgent: { type: String, default: '' },
  responseTimeMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

// Compound indexes for user and key analytics
RequestLogSchema.index({ user: 1, timestamp: -1 });
RequestLogSchema.index({ apiKey: 1, timestamp: -1 });

// TTL Index: Auto-delete logs older than 7 days (604800 seconds)
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('RequestLog', RequestLogSchema);
