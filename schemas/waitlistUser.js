const mongoose = require('mongoose');

const waitlistUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        required: false
    },
    verificationTokenExpires: {
        type: Date,
        required: false
    },
    referralCode: {
        type: String,
        unique: true,
        required: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WaitlistUser',
        default: null
    },
    referredByCode: {
        type: String,
        default: null
    },
    referralCount: {
        type: Number,
        default: 0
    },
    currentTier: {
        type: Number,
        default: 0  // 0=base, 1=tier1, 2=tier2, 3=tier3, 4=tier4
    },
    tier1UnlockedAt: { type: Date, default: null },
    tier2UnlockedAt: { type: Date, default: null },
    tier3UnlockedAt: { type: Date, default: null },
    tier4UnlockedAt: { type: Date, default: null },
    ipAddress: {
        type: String,
        required: false
    },
    convertkitSynced: {
        type: Boolean,
        default: false
    },
    convertkitSubscriberId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
waitlistUserSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Generate unique referral code
waitlistUserSchema.statics.generateReferralCode = async function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
    let code;
    let exists = true;

    while (exists) {
        code = 'LF-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        exists = await this.findOne({ referralCode: code });
    }

    return code;
};

// Tier thresholds
waitlistUserSchema.statics.TIER_THRESHOLDS = {
    1: 3,   // 3 referrals for tier 1
    2: 6,   // 6 referrals for tier 2
    3: 10,  // 10 referrals for tier 3
    4: 20   // 20 referrals for tier 4
};

// Check and update tier based on referral count
waitlistUserSchema.methods.checkAndUpdateTier = function() {
    const thresholds = this.constructor.TIER_THRESHOLDS;
    let newTier = 0;
    const now = new Date();
    let tierChanged = false;

    if (this.referralCount >= thresholds[4] && this.currentTier < 4) {
        newTier = 4;
        if (!this.tier4UnlockedAt) this.tier4UnlockedAt = now;
        if (!this.tier3UnlockedAt) this.tier3UnlockedAt = now;
        if (!this.tier2UnlockedAt) this.tier2UnlockedAt = now;
        if (!this.tier1UnlockedAt) this.tier1UnlockedAt = now;
        tierChanged = this.currentTier < 4;
    } else if (this.referralCount >= thresholds[3] && this.currentTier < 3) {
        newTier = 3;
        if (!this.tier3UnlockedAt) this.tier3UnlockedAt = now;
        if (!this.tier2UnlockedAt) this.tier2UnlockedAt = now;
        if (!this.tier1UnlockedAt) this.tier1UnlockedAt = now;
        tierChanged = this.currentTier < 3;
    } else if (this.referralCount >= thresholds[2] && this.currentTier < 2) {
        newTier = 2;
        if (!this.tier2UnlockedAt) this.tier2UnlockedAt = now;
        if (!this.tier1UnlockedAt) this.tier1UnlockedAt = now;
        tierChanged = this.currentTier < 2;
    } else if (this.referralCount >= thresholds[1] && this.currentTier < 1) {
        newTier = 1;
        if (!this.tier1UnlockedAt) this.tier1UnlockedAt = now;
        tierChanged = this.currentTier < 1;
    } else {
        newTier = this.currentTier;
    }

    if (newTier > this.currentTier) {
        this.currentTier = newTier;
    }

    return { tierChanged, newTier };
};

// Get tier info for display
waitlistUserSchema.methods.getTierInfo = function() {
    const thresholds = this.constructor.TIER_THRESHOLDS;
    const tierRewards = {
        0: {
            name: 'Base Rewards',
            rewards: [
                { name: 'The Cold Email Bible', link: process.env.REWARD_COLD_EMAIL_BIBLE || '#' },
                { name: 'Email Generator', link: process.env.REWARD_EMAIL_GENERATOR || '#' },
                { name: '10 Proven Niches + AI Prompt', link: process.env.REWARD_NICHES_PROMPT || '#' },
                { name: 'Exclusive Partner Discounts', link: process.env.REWARD_PARTNER_DISCOUNTS || '#' }
            ]
        },
        1: {
            name: 'Tier 1',
            referralsRequired: thresholds[1],
            rewards: [
                { name: 'Subject Line & CTA Masterclass', link: process.env.REWARD_TIER_1 || '#' }
            ]
        },
        2: {
            name: 'Tier 2',
            referralsRequired: thresholds[2],
            rewards: [
                { name: 'Offer Creation System + Custom GPT', link: process.env.REWARD_TIER_2 || '#' }
            ]
        },
        3: {
            name: 'Tier 3',
            referralsRequired: thresholds[3],
            rewards: [
                { name: 'Dream 100 System + 1:1 Strategy Call', link: process.env.REWARD_TIER_3 || '#' }
            ]
        },
        4: {
            name: 'Tier 4',
            referralsRequired: thresholds[4],
            rewards: [
                { name: 'Complete Agency Roadmap', link: process.env.REWARD_TIER_4 || '#' }
            ]
        }
    };

    // Calculate progress to next tier
    let nextTier = this.currentTier + 1;
    let referralsToNextTier = 0;
    let progress = 100;

    if (nextTier <= 4) {
        const currentThreshold = this.currentTier > 0 ? thresholds[this.currentTier] : 0;
        const nextThreshold = thresholds[nextTier];
        referralsToNextTier = nextThreshold - this.referralCount;
        const referralsInTier = this.referralCount - currentThreshold;
        const tierRange = nextThreshold - currentThreshold;
        progress = Math.min(100, Math.round((referralsInTier / tierRange) * 100));
    }

    return {
        currentTier: this.currentTier,
        referralCount: this.referralCount,
        nextTier: nextTier <= 4 ? nextTier : null,
        referralsToNextTier: referralsToNextTier > 0 ? referralsToNextTier : 0,
        progress,
        tierRewards,
        unlockedTiers: [0, ...Object.keys(thresholds).filter(t => this.currentTier >= parseInt(t)).map(t => parseInt(t))]
    };
};

module.exports = mongoose.model('WaitlistUser', waitlistUserSchema);
