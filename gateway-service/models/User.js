const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true, index: true }, // Clerk ka subject ID - single source of truth
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String },
    avatar: { type: String },
    // SaaS plan - ab tier ApiKey pe nahi, User pe hoga
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    // Stripe future ke liye
    stripeCustomerId: { type: String },
    // Limits at user level
    maxKeysAllowed: { type: Number, default: 3 }, // free me 3 keys max
    monthlyRequestLimit: { type: Number, default: 100000 },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);
