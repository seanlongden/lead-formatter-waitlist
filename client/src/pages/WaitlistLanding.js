import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const WaitlistLanding = () => {
    const [searchParams] = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(null);
    const { register, handleSubmit, formState: { errors }, getValues } = useForm();

    const referralCode = searchParams.get('ref');

    useEffect(() => {
        if (referralCode) {
            fetch(`/waitlist/validate/${referralCode}`)
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                        toast.info('Referral link applied!');
                    }
                })
                .catch(() => {});
        }
    }, [referralCode]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setAlreadyRegistered(null);

        try {
            const response = await fetch('/waitlist/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    referralCode: referralCode
                })
            });

            const result = await response.json();

            if (response.ok) {
                setSubmitted(true);
                toast.success('Check your email to verify your account!');
            } else if (response.status === 409 && result.alreadyRegistered) {
                setAlreadyRegistered(result);
                toast.info('You\'re already on the waitlist!');
            } else {
                toast.error(result.error || 'Something went wrong');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendLink = async () => {
        const email = getValues('email') || alreadyRegistered?.email;
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        try {
            const response = await fetch('/waitlist/resend-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Failed to send link');
        }
    };

    const tierRewards = [
        {
            tier: 0,
            name: 'Join Free',
            referrals: 0,
            rewards: ['The Cold Email Bible', 'Email Generator', '10 Proven Niches + AI Prompt', 'Exclusive Partner Discounts']
        },
        {
            tier: 1,
            name: 'Tier 1',
            referrals: 3,
            rewards: ['Subject Line & CTA Masterclass']
        },
        {
            tier: 2,
            name: 'Tier 2',
            referrals: 6,
            rewards: ['Offer Creation System + Custom GPT']
        },
        {
            tier: 3,
            name: 'Tier 3',
            referrals: 10,
            rewards: ['Dream 100 System + 1:1 Strategy Call'],
            featured: true
        },
        {
            tier: 4,
            name: 'Tier 4',
            referrals: 20,
            rewards: ['Complete Agency Roadmap']
        }
    ];

    return (
        <div style={styles.container}>
            {/* Hero Section */}
            <section style={styles.hero}>
                <div style={styles.badge}>
                    <span style={styles.badgeDot}></span>
                    Launching Soon
                </div>

                <h1 style={styles.title}>
                    Turn Cold Emails Into
                    <span style={styles.gradient}> Warm Leads</span>
                </h1>

                <p style={styles.subtitle}>
                    Join the waitlist and get instant access to free resources worth $500+.
                    Refer friends to unlock even more exclusive content.
                </p>

                {/* Signup Form */}
                {!submitted && !alreadyRegistered?.emailVerified ? (
                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="input"
                                style={styles.emailInput}
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Invalid email format'
                                    }
                                })}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={styles.submitBtn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                            </button>
                        </div>
                        {errors.email && (
                            <span className="error-text">{errors.email.message}</span>
                        )}
                    </form>
                ) : submitted ? (
                    <div style={styles.successBox}>
                        <h3 style={styles.successTitle}>Check your email!</h3>
                        <p style={styles.successText}>
                            We've sent you a verification link. Click it to claim your spot and get your referral link.
                        </p>
                        <button onClick={handleResendLink} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                            Resend verification email
                        </button>
                    </div>
                ) : alreadyRegistered?.emailVerified ? (
                    <div style={styles.successBox}>
                        <h3 style={styles.successTitle}>You're already on the waitlist!</h3>
                        <p style={styles.successText}>
                            <a href={`/waitlist/dashboard/${alreadyRegistered.referralCode}`}>
                                Go to your dashboard
                            </a> to see your referral link and progress.
                        </p>
                    </div>
                ) : (
                    <div style={styles.successBox}>
                        <h3 style={styles.successTitle}>Almost there!</h3>
                        <p style={styles.successText}>
                            You signed up but haven't verified your email yet.
                        </p>
                        <button onClick={handleResendLink} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Resend verification email
                        </button>
                    </div>
                )}

                <p style={styles.socialProof}>
                    1,000+ cold emailers already on the waitlist
                </p>
            </section>

            {/* Benefits Section */}
            <section style={styles.benefits}>
                <h2 style={styles.sectionTitle}>What You Get (Free)</h2>
                <div style={styles.benefitsGrid}>
                    {tierRewards[0].rewards.map((reward, i) => (
                        <div key={i} style={styles.benefitCard}>
                            <div style={styles.benefitIcon}>
                                {['📚', '✉️', '🎯', '🎁'][i]}
                            </div>
                            <h3 style={styles.benefitTitle}>{reward}</h3>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tiers Section */}
            <section style={styles.tiers}>
                <h2 style={styles.sectionTitle}>Refer Friends, Unlock More</h2>
                <p style={styles.sectionSubtitle}>
                    Share your unique referral link. When friends join, you unlock exclusive rewards.
                </p>

                <div style={styles.tiersGrid}>
                    {tierRewards.slice(1).map((tier) => (
                        <div
                            key={tier.tier}
                            style={{
                                ...styles.tierCard,
                                ...(tier.featured ? styles.tierCardFeatured : {})
                            }}
                        >
                            {tier.featured && (
                                <div style={styles.featuredBadge}>Most Popular</div>
                            )}
                            <div style={styles.tierHeader}>
                                <span style={styles.tierName}>{tier.name}</span>
                                <span style={styles.tierReferrals}>{tier.referrals} referrals</span>
                            </div>
                            <ul style={styles.tierRewards}>
                                {tier.rewards.map((reward, i) => (
                                    <li key={i} style={styles.tierReward}>
                                        <span style={styles.checkmark}>✓</span> {reward}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section style={styles.finalCta}>
                <h2 style={styles.ctaTitle}>Ready to Level Up Your Cold Email Game?</h2>
                <p style={styles.ctaSubtitle}>
                    No credit card required. No commitment. Just free value.
                </p>
                <button
                    className="btn btn-primary"
                    style={styles.ctaBtn}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Join the Waitlist Now
                </button>
            </section>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        padding: '2rem 1rem'
    },
    hero: {
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '3rem 0'
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        padding: '0.5rem 1rem',
        borderRadius: '2rem',
        fontSize: '0.875rem',
        color: '#818cf8',
        marginBottom: '1.5rem'
    },
    badgeDot: {
        width: '8px',
        height: '8px',
        background: '#22c55e',
        borderRadius: '50%',
        animation: 'pulse 2s infinite'
    },
    title: {
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        fontWeight: '700',
        lineHeight: '1.1',
        marginBottom: '1.5rem'
    },
    gradient: {
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    },
    subtitle: {
        fontSize: '1.125rem',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: '2rem',
        maxWidth: '500px',
        marginLeft: 'auto',
        marginRight: 'auto'
    },
    form: {
        maxWidth: '450px',
        margin: '0 auto'
    },
    inputGroup: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
    },
    emailInput: {
        flex: '1',
        minWidth: '200px'
    },
    submitBtn: {
        whiteSpace: 'nowrap'
    },
    successBox: {
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '1rem',
        padding: '1.5rem',
        maxWidth: '450px',
        margin: '0 auto'
    },
    successTitle: {
        color: '#22c55e',
        fontSize: '1.25rem',
        marginBottom: '0.5rem'
    },
    successText: {
        color: 'rgba(255, 255, 255, 0.8)'
    },
    socialProof: {
        marginTop: '1.5rem',
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.5)'
    },
    benefits: {
        maxWidth: '900px',
        margin: '4rem auto',
        textAlign: 'center'
    },
    sectionTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        marginBottom: '1rem'
    },
    sectionSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '2rem'
    },
    benefitsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
    },
    benefitCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        padding: '1.5rem',
        textAlign: 'center'
    },
    benefitIcon: {
        fontSize: '2rem',
        marginBottom: '0.75rem'
    },
    benefitTitle: {
        fontSize: '1rem',
        fontWeight: '600'
    },
    tiers: {
        maxWidth: '1000px',
        margin: '4rem auto',
        textAlign: 'center'
    },
    tiersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginTop: '2rem'
    },
    tierCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        padding: '1.5rem',
        textAlign: 'left',
        position: 'relative'
    },
    tierCardFeatured: {
        border: '2px solid #6366f1',
        background: 'rgba(99, 102, 241, 0.1)'
    },
    featuredBadge: {
        position: 'absolute',
        top: '-12px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.25rem 0.75rem',
        borderRadius: '1rem'
    },
    tierHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
    },
    tierName: {
        fontWeight: '700',
        fontSize: '1.125rem'
    },
    tierReferrals: {
        fontSize: '0.875rem',
        color: '#818cf8'
    },
    tierRewards: {
        listStyle: 'none',
        padding: 0
    },
    tierReward: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.9rem'
    },
    checkmark: {
        color: '#22c55e',
        fontWeight: '700'
    },
    finalCta: {
        textAlign: 'center',
        padding: '4rem 1rem',
        maxWidth: '600px',
        margin: '0 auto'
    },
    ctaTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        marginBottom: '0.75rem'
    },
    ctaSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '1.5rem'
    },
    ctaBtn: {
        padding: '1rem 2rem',
        fontSize: '1.125rem'
    }
};

export default WaitlistLanding;
