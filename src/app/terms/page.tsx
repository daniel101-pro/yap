import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-[13px] font-semibold text-exeter hover:underline">
          ← Back to YAP
        </Link>
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-muted">Last updated September 2026</p>

        <div className="prose-yap mt-8 space-y-6 text-[14px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Who can use YAP</h2>
            <p className="mt-2 text-muted">
              YAP is for verified University of Exeter students with an active @exeter.ac.uk email.
              You must be 18 or older to buy or sell nightlife tickets.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Your content</h2>
            <p className="mt-2 text-muted">
              Posts and listings are your responsibility. Don&apos;t post illegal content, harassment,
              scams, or copyrighted material without permission. We may remove content and suspend
              accounts that break these rules.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Marketplace &amp; tickets</h2>
            <p className="mt-2 text-muted">
              YAP facilitates student-to-student sales. Ticket resale is subject to venue terms.
              Payments for nightlife tickets are processed by Stripe; YAP is not the event organiser.
            </p>
          </section>
          <section>
            <h2 className="text-[16px] font-bold text-foreground">Contact</h2>
            <p className="mt-2 text-muted">
              Questions? Email{' '}
              <a href="mailto:hello@yap.college" className="font-semibold text-exeter hover:underline">
                hello@yap.college
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
