import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const WaitlistDashboard = () => {
    const { referralCode } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await fetch(`/waitlist/dashboard/${referralCode}`);

                if (!response.ok) {
                    const result = await response.json();
                    if (response.status === 404) {
                        setError('User not found');
                    } else if (response.status === 403) {
                        setError('Please verify your email first');
                    } else {
                        setError(result.error || 'Failed to load dashboard');
                    }
                    return;
                }

                const result = await response.json();
                setData(result);
            } catch (err) {
                setError('Network error. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [referralCode]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(data.referralLink);
            setCopied(true);
            toast.success('Copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const shareOnTwitter = () => {
        const text = `I just joined the Lead Formatter waitlist! Join using my link and we both get free resources:`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.referralLink)}`;
        window.open(url, '_blank');
    };

    const shareOnLinkedIn = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referralLink)}`;
        window.open(url, '_blank');
    };

    const shareViaEmail = () => {
        const subject = 'Check out Lead Formatter';
        const body = `Hey!\n\nI just joined the Lead Formatter waitlist and got access to some amazing free resources for cold email.\n\nJoin using my link: ${data.referralLink}\n\nYou'll get instant access to:\n- The Cold Email Bible\n- Email Generator\n- 10 Proven Niches + AI Prompt\n- Exclusive Partner Discounts`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading your dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <h2 style={styles.errorTitle}>{error}</h2>
                    <a href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Back to Homepage
                    </a>
                </div>
            </div>
        );
    }

    const { tierRewards, unlockedTiers, currentTier, referralCount, nextTier, referralsToNextTier, progress } = data;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>You're on the Waitlist!</h1>
                <p style={styles.email}>{data.email}</p>
            </div>

            {/* Referral Link Section */}
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Your Referral Link</h2>
                <div style={styles.linkBox}>
                    <input
                        type="text"
                        value={data.referralLink}
                        readOnly
                        style={styles.linkInput}
                    />
                    <button
                        onClick={copyToClipboard}
                        className="btn btn-primary"
                        style={styles.copyBtn}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div style={styles.shareButtons}>
                    <button onClick={shareOnTwitter} style={styles.shareBtn} title="Share on Twitter">
                        <span style={styles.shareIcon}>𝕏</span>
                    </button>
                    <button onClick={shareOnLinkedIn} style={styles.shareBtn} title="Share on LinkedIn">
                        <span style={styles.shareIcon}>in</span>
                    </button>
                    <button onClick={shareViaEmail} style={styles.shareBtn} title="Share via Email">
                        <span style={styles.shareIcon}>✉️</span>
                    </button>
                </div>
            </div>

            {/* Progress Section */}
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Your Progress</h2>
                <div style={styles.stats}>
                    <div style={styles.stat}>
                        <span style={styles.statNumber}>{referralCount}</span>
                        <span style={styles.statLabel}>Referrals</span>
                    </div>
                    <div style={styles.stat}>
                        <span style={styles.statNumber}>Tier {currentTier}</span>
                        <span style={styles.statLabel}>Current Level</span>
                    </div>
                </div>

                {nextTier && (
                    <div style={styles.progressSection}>
                        <div style={styles.progressHeader}>
                            <span>{referralsToNextTier} more to Tier {nextTier}</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
                        </div>
                        <p style={styles.nextReward}>
                            Next unlock: <strong>{tierRewards[nextTier]?.rewards[0]?.name}</strong>
                        </p>
                    </div>
                )}
            </div>

            {/* Rewards Section */}
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Your Rewards</h2>

                {/* Unlocked Rewards */}
                {unlockedTiers.map(tier => (
                    <div key={tier} style={styles.rewardTier}>
                        <h3 style={styles.rewardTierTitle}>
                            <span style={styles.unlocked}>✓</span> {tierRewards[tier].name}
                        </h3>
                        <ul style={styles.rewardList}>
                            {tierRewards[tier].rewards.map((reward, i) => (
                                <li key={i} style={styles.rewardItem}>
                                    <span style={styles.rewardName}>{reward.name}</span>
                                    <a
                                        href={reward.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                        style={styles.accessBtn}
                                    >
                                        Access
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {/* Locked Rewards */}
                {[1, 2, 3, 4].filter(t => !unlockedTiers.includes(t)).map(tier => (
                    <div key={tier} style={{ ...styles.rewardTier, ...styles.lockedTier }}>
                        <h3 style={styles.rewardTierTitle}>
                            <span style={styles.locked}>🔒</span> {tierRewards[tier].name}
                            <span style={styles.referralsNeeded}>
                                ({tierRewards[tier].referralsRequired} referrals)
                            </span>
                        </h3>
                        <ul style={styles.rewardList}>
                            {tierRewards[tier].rewards.map((reward, i) => (
                                <li key={i} style={{ ...styles.rewardItem, opacity: 0.5 }}>
                                    <span style={styles.rewardName}>{reward.name}</span>
                                    <span style={styles.lockedBtn}>Locked</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Referral List */}
            {data.referralList && data.referralList.length > 0 && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Your Referrals</h2>
                    <ul style={styles.referralList}>
                        {data.referralList.map((ref, i) => (
                            <li key={i} style={styles.referralItem}>
                                <span>{ref.email}</span>
                                <span style={styles.referralDate}>
                                    {new Date(ref.date).toLocaleDateString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        padding: '2rem 1rem',
        maxWidth: '700px',
        margin: '0 auto'
    },
    loading: {
        textAlign: 'center',
        padding: '4rem',
        color: 'rgba(255, 255, 255, 0.6)'
    },
    errorBox: {
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '1rem'
    },
    errorTitle: {
        color: '#ef4444'
    },
    header: {
        textAlign: 'center',
        marginBottom: '2rem'
    },
    title: {
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '0.5rem'
    },
    email: {
        color: 'rgba(255, 255, 255, 0.6)'
    },
    card: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem'
    },
    cardTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '1rem'
    },
    linkBox: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem'
    },
    linkInput: {
        flex: 1,
        padding: '0.75rem 1rem',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '0.5rem',
        color: 'white',
        fontSize: '0.9rem'
    },
    copyBtn: {
        whiteSpace: 'nowrap'
    },
    shareButtons: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center'
    },
    shareBtn: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
    },
    shareIcon: {
        fontSize: '1.25rem'
    },
    stats: {
        display: 'flex',
        gap: '2rem',
        marginBottom: '1.5rem'
    },
    stat: {
        display: 'flex',
        flexDirection: 'column'
    },
    statNumber: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#818cf8'
    },
    statLabel: {
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.6)'
    },
    progressSection: {
        marginTop: '1rem'
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.8)'
    },
    progressBar: {
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
        borderRadius: '4px',
        transition: 'width 0.3s ease'
    },
    nextReward: {
        marginTop: '0.75rem',
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.7)'
    },
    rewardTier: {
        marginBottom: '1.5rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    },
    lockedTier: {
        opacity: 0.7
    },
    rewardTierTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '0.75rem'
    },
    unlocked: {
        color: '#22c55e'
    },
    locked: {
        fontSize: '1rem'
    },
    referralsNeeded: {
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'normal',
        marginLeft: 'auto'
    },
    rewardList: {
        listStyle: 'none',
        padding: 0
    },
    rewardItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    rewardName: {
        flex: 1
    },
    accessBtn: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem'
    },
    lockedBtn: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.4)',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.5rem'
    },
    referralList: {
        listStyle: 'none',
        padding: 0
    },
    referralItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.75rem 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    referralDate: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.875rem'
    }
};

export default WaitlistDashboard;
