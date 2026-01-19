import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const WaitlistVerify = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setError('No verification token provided');
            return;
        }

        // The backend handles verification and redirects to dashboard
        // This page is a fallback if the redirect doesn't work
        fetch(`/waitlist/verify?token=${token}`)
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Verification failed');
                }
            })
            .then(data => {
                if (data && data.referralCode) {
                    window.location.href = `/waitlist/dashboard/${data.referralCode}`;
                }
            })
            .catch(err => {
                setStatus('error');
                setError(err.message || 'Verification failed. The link may have expired.');
            });
    }, [searchParams]);

    return (
        <div style={styles.container}>
            <div style={styles.box}>
                {status === 'verifying' ? (
                    <>
                        <div style={styles.spinner}></div>
                        <h2 style={styles.title}>Verifying your email...</h2>
                        <p style={styles.text}>Please wait while we confirm your email address.</p>
                    </>
                ) : (
                    <>
                        <div style={styles.errorIcon}>✕</div>
                        <h2 style={styles.errorTitle}>Verification Failed</h2>
                        <p style={styles.text}>{error}</p>
                        <a href="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                            Back to Homepage
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
    },
    box: {
        textAlign: 'center',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        padding: '3rem',
        maxWidth: '400px',
        width: '100%'
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1.5rem'
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '0.5rem'
    },
    text: {
        color: 'rgba(255, 255, 255, 0.6)'
    },
    errorIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        fontSize: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem'
    },
    errorTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: '#ef4444'
    }
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(styleSheet);

export default WaitlistVerify;
