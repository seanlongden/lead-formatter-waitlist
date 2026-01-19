/**
 * ConvertKit Integration for Waitlist Referral System
 *
 * Syncs waitlist users to ConvertKit with tags for email automations.
 *
 * Environment Variables Required:
 * - CONVERTKIT_API_KEY: Your ConvertKit API key
 * - CONVERTKIT_API_SECRET: Your ConvertKit API secret
 * - CONVERTKIT_FORM_ID: The form ID to subscribe users to
 * - CONVERTKIT_TAG_WAITLIST: Tag for all waitlist signups
 * - CONVERTKIT_TAG_TIER_0 through CONVERTKIT_TAG_TIER_4: Tags per tier
 * - CONVERTKIT_TAG_NEW_REFERRAL: Tag triggered when someone refers a user
 */

const axios = require('axios');

const CONVERTKIT_API_URL = 'https://api.convertkit.com/v3';

/**
 * Add a subscriber to ConvertKit
 */
async function addSubscriber(email, options = {}) {
    const { referralCode, referredBy, firstName } = options;

    if (!process.env.CONVERTKIT_API_KEY || !process.env.CONVERTKIT_FORM_ID) {
        console.log('ConvertKit not configured, skipping subscriber sync');
        return null;
    }

    try {
        const response = await axios.post(
            `${CONVERTKIT_API_URL}/forms/${process.env.CONVERTKIT_FORM_ID}/subscribe`,
            {
                api_key: process.env.CONVERTKIT_API_KEY,
                email: email,
                first_name: firstName || '',
                fields: {
                    referral_code: referralCode || '',
                    referred_by: referredBy || ''
                },
                tags: [process.env.CONVERTKIT_TAG_WAITLIST].filter(Boolean)
            }
        );

        console.log(`ConvertKit: Added subscriber ${email}`);
        return response.data.subscription?.subscriber?.id || null;
    } catch (error) {
        console.error('ConvertKit addSubscriber error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Add a tag to a subscriber
 */
async function addTagToSubscriber(email, tagId) {
    if (!process.env.CONVERTKIT_API_KEY || !tagId) {
        return false;
    }

    try {
        await axios.post(
            `${CONVERTKIT_API_URL}/tags/${tagId}/subscribe`,
            {
                api_key: process.env.CONVERTKIT_API_KEY,
                email: email
            }
        );

        console.log(`ConvertKit: Added tag ${tagId} to ${email}`);
        return true;
    } catch (error) {
        console.error('ConvertKit addTag error:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Update subscriber's tier tag
 */
async function updateTierTag(email, tier) {
    const tierTags = {
        0: process.env.CONVERTKIT_TAG_TIER_0,
        1: process.env.CONVERTKIT_TAG_TIER_1,
        2: process.env.CONVERTKIT_TAG_TIER_2,
        3: process.env.CONVERTKIT_TAG_TIER_3,
        4: process.env.CONVERTKIT_TAG_TIER_4
    };

    const tagId = tierTags[tier];
    if (!tagId) {
        console.log(`No tag configured for tier ${tier}`);
        return false;
    }

    return await addTagToSubscriber(email, tagId);
}

/**
 * Notify that a user made a successful referral (for automation triggers)
 */
async function triggerNewReferralTag(email) {
    const tagId = process.env.CONVERTKIT_TAG_NEW_REFERRAL;
    if (!tagId) {
        console.log('No new referral tag configured');
        return false;
    }

    return await addTagToSubscriber(email, tagId);
}

/**
 * Update custom field for a subscriber
 */
async function updateSubscriberField(email, fieldName, value) {
    if (!process.env.CONVERTKIT_API_SECRET) {
        console.log('ConvertKit API secret not configured');
        return false;
    }

    try {
        // First, get the subscriber
        const searchResponse = await axios.get(
            `${CONVERTKIT_API_URL}/subscribers`,
            {
                params: {
                    api_secret: process.env.CONVERTKIT_API_SECRET,
                    email_address: email
                }
            }
        );

        const subscriber = searchResponse.data.subscribers?.[0];
        if (!subscriber) {
            console.log(`ConvertKit: Subscriber ${email} not found`);
            return false;
        }

        // Update the subscriber
        await axios.put(
            `${CONVERTKIT_API_URL}/subscribers/${subscriber.id}`,
            {
                api_secret: process.env.CONVERTKIT_API_SECRET,
                fields: {
                    [fieldName]: value
                }
            }
        );

        console.log(`ConvertKit: Updated ${fieldName} for ${email}`);
        return true;
    } catch (error) {
        console.error('ConvertKit updateField error:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Sync a user's referral count to ConvertKit
 */
async function syncReferralCount(email, count) {
    return await updateSubscriberField(email, 'referral_count', count.toString());
}

/**
 * Full sync of user to ConvertKit after verification
 */
async function syncVerifiedUser(user) {
    // Add subscriber
    const subscriberId = await addSubscriber(user.email, {
        referralCode: user.referralCode,
        referredBy: user.referredByCode || ''
    });

    // Add tier 0 tag (verified user)
    await updateTierTag(user.email, 0);

    return subscriberId;
}

/**
 * Handle tier upgrade - add new tier tag and trigger automation
 */
async function handleTierUpgrade(email, newTier) {
    await updateTierTag(email, newTier);
}

module.exports = {
    addSubscriber,
    addTagToSubscriber,
    updateTierTag,
    triggerNewReferralTag,
    updateSubscriberField,
    syncReferralCount,
    syncVerifiedUser,
    handleTierUpgrade
};
