const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Models
const WaitlistUser = require('../schemas/waitlistUser');
const Referral = require('../schemas/referral');

// Services
const convertkit = require('../lib/convertkit');

// ============================================
// FRAUD PREVENTION
// ============================================

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
    'tempail.com', 'discard.email', 'sharklasers.com', 'guerrillamail.info',
    'grr.la', 'spam4.me', 'yopmail.com', 'getnada.com', 'tempmailo.com',
    'mohmal.com', 'tempr.email', 'dropmail.me', 'emailondeck.com',
    'temp.email', 'fakemailgenerator.com', 'generator.email', 'emailfake.com',
    'crazymailing.com', 'tempinbox.com', 'getairmail.com', 'dispostable.com'
];

function isDisposableEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

// Rate limiting - 3 signups per IP per 24 hours
const signupLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3,
    message: { error: 'Too many signups from this IP. Please try again later.' },
    keyGenerator: (req) => req.ip,
    standardHeaders: true,
    legacyHeaders: false
});

// Resend link rate limiter - 5 per hour
const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many requests. Please wait before requesting again.' }
});

// ============================================
// API ROUTES
// ============================================

/**
 * POST /waitlist/signup
 * Register a new user for the waitlist
 */
router.post('/signup', signupLimiter, async (req, res) => {
    try {
        const { email, referralCode } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check for disposable email
        if (isDisposableEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Please use a non-disposable email address' });
        }

        // Check if email already exists
        const existingUser = await WaitlistUser.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered',
                alreadyRegistered: true,
                emailVerified: existingUser.emailVerified,
                referralCode: existingUser.emailVerified ? existingUser.referralCode : null
            });
        }

        // Validate referral code if provided
        let referrer = null;
        if (referralCode) {
            referrer = await WaitlistUser.findOne({
                referralCode: referralCode.toUpperCase(),
                emailVerified: true
            });
            // Don't error if referral code is invalid, just ignore it
        }

        // Generate unique referral code and verification token
        const newReferralCode = await WaitlistUser.generateReferralCode();
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user
        const user = new WaitlistUser({
            email: normalizedEmail,
            referralCode: newReferralCode,
            referredBy: referrer?._id || null,
            referredByCode: referrer?.referralCode || null,
            verificationToken,
            verificationTokenExpires,
            ipAddress: req.ip
        });

        await user.save();

        // Add to ConvertKit (unverified - you may want a different tag)
        // Note: We'll fully sync after verification

        // In production, send verification email via ConvertKit automation
        // For now, return the token (in production, this would be sent via email only)
        const verificationUrl = `${process.env.BASE_URL}/waitlist/verify?token=${verificationToken}`;

        res.status(201).json({
            success: true,
            message: 'Please check your email to verify your account',
            // Remove these in production - only for testing
            ...(process.env.NODE_ENV === 'development' && {
                verificationUrl,
                verificationToken
            })
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

/**
 * GET /waitlist/verify
 * Verify email address
 */
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await WaitlistUser.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        if (user.emailVerified) {
            // Already verified, redirect to dashboard
            return res.redirect(`/waitlist/dashboard/${user.referralCode}`);
        }

        // Mark as verified
        user.emailVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;

        // Credit the referrer if applicable
        if (user.referredBy) {
            const referrer = await WaitlistUser.findById(user.referredBy);
            if (referrer) {
                referrer.referralCount += 1;
                const { tierChanged, newTier } = referrer.checkAndUpdateTier();
                await referrer.save();

                // Create referral record
                await Referral.create({
                    referrerId: referrer._id,
                    referredId: user._id,
                    referralCode: referrer.referralCode
                });

                // Sync to ConvertKit
                await convertkit.syncReferralCount(referrer.email, referrer.referralCount);
                await convertkit.triggerNewReferralTag(referrer.email);

                if (tierChanged) {
                    await convertkit.handleTierUpgrade(referrer.email, newTier);
                }
            }
        }

        await user.save();

        // Sync verified user to ConvertKit
        const subscriberId = await convertkit.syncVerifiedUser(user);
        if (subscriberId) {
            user.convertkitSynced = true;
            user.convertkitSubscriberId = subscriberId;
            await user.save();
        }

        // Redirect to dashboard
        res.redirect(`/waitlist/dashboard/${user.referralCode}`);

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

/**
 * GET /waitlist/dashboard/:referralCode
 * Get user dashboard data
 */
router.get('/dashboard/:referralCode', async (req, res) => {
    try {
        const { referralCode } = req.params;

        const user = await WaitlistUser.findOne({
            referralCode: referralCode.toUpperCase()
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Email not verified',
                emailVerified: false
            });
        }

        // Get referral list (first names or masked emails)
        const referrals = await Referral.find({ referrerId: user._id })
            .populate('referredId', 'email createdAt')
            .sort({ createdAt: -1 })
            .limit(50);

        const referralList = referrals.map(r => ({
            email: r.referredId?.email ? maskEmail(r.referredId.email) : 'Unknown',
            date: r.createdAt
        }));

        const tierInfo = user.getTierInfo();
        const referralLink = `${process.env.BASE_URL || 'https://leadformatter.com'}/waitlist?ref=${user.referralCode}`;

        res.json({
            email: maskEmail(user.email),
            referralCode: user.referralCode,
            referralLink,
            ...tierInfo,
            referralList,
            joinedAt: user.createdAt
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

/**
 * POST /waitlist/resend-link
 * Resend verification email or dashboard link
 */
router.post('/resend-link', resendLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await WaitlistUser.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // Don't reveal if email exists
            return res.json({ success: true, message: 'If this email is registered, you will receive a link shortly.' });
        }

        if (user.emailVerified) {
            // Send dashboard link
            // In production, trigger ConvertKit automation
            const dashboardUrl = `${process.env.BASE_URL}/waitlist/dashboard/${user.referralCode}`;

            return res.json({
                success: true,
                message: 'Dashboard link sent to your email',
                ...(process.env.NODE_ENV === 'development' && { dashboardUrl })
            });
        } else {
            // Regenerate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            user.verificationToken = verificationToken;
            user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save();

            const verificationUrl = `${process.env.BASE_URL}/waitlist/verify?token=${verificationToken}`;

            return res.json({
                success: true,
                message: 'Verification email sent',
                ...(process.env.NODE_ENV === 'development' && { verificationUrl })
            });
        }

    } catch (error) {
        console.error('Resend link error:', error);
        res.status(500).json({ error: 'Failed to send link' });
    }
});

/**
 * GET /waitlist/validate/:referralCode
 * Check if a referral code is valid
 */
router.get('/validate/:referralCode', async (req, res) => {
    try {
        const { referralCode } = req.params;

        const user = await WaitlistUser.findOne({
            referralCode: referralCode.toUpperCase(),
            emailVerified: true
        });

        res.json({
            valid: !!user,
            referralCode: referralCode.toUpperCase()
        });

    } catch (error) {
        res.json({ valid: false });
    }
});

/**
 * GET /waitlist/stats
 * Public stats/leaderboard
 */
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await WaitlistUser.countDocuments({ emailVerified: true });
        const totalReferrals = await Referral.countDocuments();

        // Top referrers (anonymized)
        const topReferrers = await WaitlistUser.find({ emailVerified: true, referralCount: { $gt: 0 } })
            .sort({ referralCount: -1 })
            .limit(10)
            .select('referralCode referralCount currentTier');

        const leaderboard = topReferrers.map((u, index) => ({
            rank: index + 1,
            referralCode: u.referralCode,
            referralCount: u.referralCount,
            tier: u.currentTier
        }));

        res.json({
            totalUsers,
            totalReferrals,
            leaderboard
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

/**
 * GET /waitlist/admin/users
 * Admin endpoint to see all users (protected by header)
 */
router.get('/admin/users', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];

        if (!process.env.WAITLIST_ADMIN_KEY || adminKey !== process.env.WAITLIST_ADMIN_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { page = 1, limit = 50, sort = '-createdAt' } = req.query;

        const users = await WaitlistUser.find()
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-verificationToken -__v');

        const total = await WaitlistUser.countDocuments();
        const verified = await WaitlistUser.countDocuments({ emailVerified: true });
        const unverified = await WaitlistUser.countDocuments({ emailVerified: false });
        const totalReferrals = await Referral.countDocuments();

        // Tier breakdown
        const tierBreakdown = await WaitlistUser.aggregate([
            { $match: { emailVerified: true } },
            { $group: { _id: '$currentTier', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            stats: {
                total,
                verified,
                unverified,
                totalReferrals,
                tierBreakdown: tierBreakdown.reduce((acc, t) => {
                    acc[`tier${t._id}`] = t.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

/**
 * GET /waitlist/admin/export
 * Export users as CSV
 */
router.get('/admin/export', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];

        if (!process.env.WAITLIST_ADMIN_KEY || adminKey !== process.env.WAITLIST_ADMIN_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const users = await WaitlistUser.find({ emailVerified: true })
            .sort('-createdAt')
            .select('email referralCode referralCount currentTier createdAt referredByCode');

        const csv = [
            'Email,Referral Code,Referral Count,Tier,Referred By,Joined At',
            ...users.map(u =>
                `${u.email},${u.referralCode},${u.referralCount},${u.currentTier},${u.referredByCode || ''},${u.createdAt.toISOString()}`
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=waitlist-export.csv');
        res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export' });
    }
});

// Helper function to mask email
function maskEmail(email) {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}***@${domain}`;
}

module.exports = router;
