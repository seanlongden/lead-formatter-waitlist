# Lead Formatter Waitlist

A viral referral waitlist system - your own Viral Loops alternative. Users sign up, get a unique referral link, and unlock tiered rewards as they refer friends.

## Features

- Email signup with verification
- Unique referral links for each user (format: `LF-XXXXXX`)
- Tiered rewards system (3, 6, 10, 20 referrals)
- ConvertKit integration for email automations
- Fraud prevention (IP limits, disposable email blocking)
- User dashboard with progress tracking
- Admin dashboard with stats and CSV export

## Tier Structure

| Tier | Referrals | Reward |
|------|-----------|--------|
| Base | 0 (join) | Cold Email Bible, Email Generator, 10 Niches + AI Prompt, Partner Discounts |
| 1 | 3 | Subject Line & CTA Masterclass |
| 2 | 6 | Offer Creation System + Custom GPT |
| 3 | 10 | Dream 100 System + 1:1 Strategy Call |
| 4 | 20 | Complete Agency Roadmap |

## Tech Stack

- **Backend**: Node.js, Express, MongoDB
- **Frontend**: React
- **Email**: ConvertKit (via API + automations)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Set up ConvertKit

1. Create a form in ConvertKit for the waitlist
2. Create tags for each tier (lf-waitlist, lf-tier-0, lf-tier-1, etc.)
3. Get your API key and form ID
4. Add tag IDs to `.env`
5. Set up automations in ConvertKit:
   - When tag `lf-tier-0` added → Send welcome email
   - When tag `lf-tier-1` added → Send tier 1 unlock email
   - etc.

### 4. Run locally

```bash
# Development (with hot reload)
npm run dev

# In another terminal, run the React app
npm run client
```

### 5. Deploy

Build the React app and serve everything from Express:

```bash
npm run client:build
NODE_ENV=production npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/waitlist/signup` | Register new user |
| GET | `/waitlist/verify?token=` | Verify email |
| GET | `/waitlist/dashboard/:code` | Get user dashboard |
| POST | `/waitlist/resend-link` | Resend verification/dashboard link |
| GET | `/waitlist/validate/:code` | Check if referral code valid |
| GET | `/waitlist/stats` | Public leaderboard |
| GET | `/waitlist/admin/users` | Admin: list all users |
| GET | `/waitlist/admin/export` | Admin: export CSV |

## Admin Access

Admin endpoints require the `x-admin-key` header:

```bash
curl -H "x-admin-key: YOUR_ADMIN_KEY" http://localhost:3001/waitlist/admin/users
```

## Fraud Prevention

- **Email verification required** - Referral doesn't count until email verified
- **Duplicate email blocked** - Can't sign up twice with same email
- **IP rate limiting** - Max 3 signups per IP per 24 hours
- **Disposable email blocking** - Common disposable domains blocked
- **Self-referral blocked** - Can't use your own referral link

## License

MIT
