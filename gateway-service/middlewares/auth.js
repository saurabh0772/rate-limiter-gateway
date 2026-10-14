const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');


const attachUser = async (req, res, next) => {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        const clerkId = req.auth.userId;
        let user = await User.findOne({ clerkId });

        // Auto-create if not exists
        if (!user) {
            try {
                const clerkUser = await clerkClient.users.getUser(clerkId);
                const primaryEmail = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
                    || clerkUser.emailAddresses?.[0]?.emailAddress
                    || `${clerkId}@clerk.user`;
                const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || 'User';

                user = await User.create({
                    clerkId,
                    email: primaryEmail,
                    name: fullName,
                    avatar: clerkUser.imageUrl,
                    lastLoginAt: new Date()
                });
            } catch (createErr) {
                // If created concurrently by another request
                user = await User.findOne({ clerkId });
                if (!user) {
                    throw createErr;
                }
            }
        } else {
            await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('attachUser error:', err);
        res.status(500).json({ error: 'Auth failed' });
    }
};

module.exports = { attachUser };

