import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-[13px] font-semibold text-exeter hover:underline">
          ← Back to YAP
        </Link>
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-[13px] text-muted">Last updated September 2026</p>

        <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-[16px] font-bold text-foreground">What we collect</h2>
            <p className="mt-2 text-muted">
              Your @exeter.ac.uk email (for verification), anonymous handle, posts, listings, messages,
              and usage data needed to run the app. We don&apos;t sell your data.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">How we use it</h2>
            <p className="mt-2 text-muted">
              To authenticate you, show campus content, process marketplace messages, and send
              verification emails. Moderators may review reported content to keep the community safe.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Third parties</h2>
            <p className="mt-2 text-muted">
              We use Resend (email), Stripe (payments), Vercel (hosting &amp; file storage), and Neon
              (database). Each has their own privacy policy.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Your rights</h2>
            <p className="mt-2 text-muted">
              You can delete your account anytime in Settings. Contact{' '}
              <a href="mailto:hello@yap.college" className="font-semibold text-exeter hover:underline">
                hello@yap.college
              </a>{' '}
              for data requests.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
