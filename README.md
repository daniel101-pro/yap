This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Stripe Setup (Nightlife Resale)

To use ticket checkout and seller payouts in Nightlife, set:

```bash
STRIPE_SECRET_KEY=sk_live_or_test_xxx
```

The app now provides:
- `POST /api/stripe/connect/onboard` for seller payout onboarding (Stripe Connect Express)
- `POST /api/stripe/checkout` for buyer ticket checkout sessions

## Auth Setup

YAP uses email + 6-digit code auth. Only `@exeter.ac.uk` emails are allowed.

1. Copy `env.example` to `.env` and fill in values.
2. Install dependencies and set up the database:

```bash
npm install
npx prisma migrate dev --name init
```

3. **Email (pick one):**
   - **SMTP (easiest for dev)** — sends to any `@exeter.ac.uk` via Gmail:
     ```bash
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=you@gmail.com
     SMTP_PASS=your-16-char-app-password
     SMTP_FROM="YAP <you@gmail.com>"
     ```
     Create a Gmail [App Password](https://myaccount.google.com/apppasswords) (requires 2FA).
   - **Resend (production)** — verify your own domain at [resend.com/domains](https://resend.com/domains). The test sender `onboarding@resend.dev` cannot email `@exeter.ac.uk` addresses.

4. Generate `AUTH_SECRET`: `openssl rand -base64 32`

```bash
npm run dev
```

Sign up with your Exeter email — you'll receive a magic link to verify and sign in.
