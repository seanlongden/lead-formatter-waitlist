const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WaitlistUser',
        required: true
    },
    referredId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WaitlistUser',
        required: true
    },
    referralCode: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster lookups
referralSchema.index({ referrerId: 1 });
referralSchema.index({ referredId: 1 });
referralSchema.index({ referralCode: 1 });

module.exports = mongoose.model('Referral', referralSchema);
