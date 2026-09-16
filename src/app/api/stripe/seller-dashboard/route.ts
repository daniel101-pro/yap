import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient, isStripeConfigured } from '@/lib/stripe';
import {
  formatPayoutCountdown,
  isPayoutAvailable,
  msUntilPayout,
  payoutAvailableAt,
  poundsFromPence,
} from '@/lib/nightlife-payouts';
import { releaseDueTicketPayouts } from '@/lib/release-ticket-payouts';
import { ensureUserRepCode, repCodeUseCount } from '@/lib/rep-code';
import { fetchMnoEvent } from '@/lib/mynightout';
import { compareExeterVenueSections } from '@/lib/exeter-venues';

function listingStatusLabel(status: string): 'on_sale' | 'reserved' | 'sold' {
  if (status === 'sold') return 'sold';
  if (status === 'reserved') return 'reserved';
  return 'on_sale';
}

function eventGroupKey(title: string, mnoEventId: string | null): string {
  if (mnoEventId) return `mno:${mnoEventId}`;
  const head = title.split(' · ')[0]?.trim() || title.trim();
  return `title:${head.toLowerCase()}`;
}

function eventGroupTitle(title: string): string {
  const head = title.split(' · ')[0]?.trim();
  return head || title.trim();
}

function slotLabelFromTitle(title: string): string {
  const parts = title.split(' · ').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts.slice(1).join(' · ');
  return title.trim();
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeAccountId: true },
    });

    let connectReady = false;
    if (isStripeConfigured() && dbUser?.stripeAccountId) {
      try {
        const stripe = getStripeServerClient();
        const account = await stripe.accounts.retrieve(dbUser.stripeAccountId);
        connectReady = Boolean(account.charges_enabled && account.details_submitted);
      } catch {
        connectReady = false;
      }
    }

    if (connectReady) {
      try {
        await releaseDueTicketPayouts({ sellerId: user.id });
      } catch (err) {
        console.error('[seller-dashboard] payout release', err);
      }
    }

    const repCode = await ensureUserRepCode(user.id);
    const repUses = await repCodeUseCount(user.id);

    const sellerListings = await prisma.nightlifeTicket.findMany({
      where: {
        sellerId: user.id,
        status: { in: ['active', 'reserved', 'sold'] },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 120,
      select: {
        id: true,
        title: true,
        venue: true,
        price: true,
        status: true,
        mnoEventId: true,
        mnoTicketId: true,
        ticketProofUrl: true,
        ticketProofMime: true,
        ticketProofData: true,
        createdAt: true,
        soldAt: true,
      },
    });

    const listings = sellerListings.map((t) => {
      const saleState = listingStatusLabel(t.status);
      const hasProof = Boolean(
        t.ticketProofUrl || (t.ticketProofData && t.ticketProofData.length > 0),
      );
      return {
        id: t.id,
        title: t.title,
        slotLabel: slotLabelFromTitle(t.title),
        venue: t.venue,
        price: t.price,
        status: saleState,
        rawStatus: t.status,
        mnoEventId: t.mnoEventId,
        mnoTicketId: t.mnoTicketId,
        eventKey: eventGroupKey(t.title, t.mnoEventId),
        eventTitle: eventGroupTitle(t.title),
        listedAt: t.createdAt.toISOString(),
        soldAt: t.soldAt?.toISOString() ?? null,
        hasProof,
        proofIsPdf: (t.ticketProofMime ?? '').includes('pdf'),
        canEdit: t.status === 'active',
      };
    });

    const eventMap = new Map<
      string,
      {
        eventKey: string;
        eventTitle: string;
        venue: string;
        mnoEventId: string | null;
        listings: typeof listings;
      }
    >();
    for (const row of listings) {
      const bucket = eventMap.get(row.eventKey) ?? {
        eventKey: row.eventKey,
        eventTitle: row.eventTitle,
        venue: row.venue,
        mnoEventId: row.mnoEventId,
        listings: [],
      };
      if (!bucket.mnoEventId && row.mnoEventId) bucket.mnoEventId = row.mnoEventId;
      bucket.listings.push(row);
      eventMap.set(row.eventKey, bucket);
    }

    const mnoIds = [...new Set([...eventMap.values()].map((g) => g.mnoEventId).filter(Boolean))] as string[];
    const eventImages = new Map<string, string>();
    await Promise.all(
      mnoIds.map(async (id) => {
        const ev = await fetchMnoEvent(id);
        if (ev?.image) eventImages.set(id, ev.image);
      }),
    );

    const eventsByGroup = [...eventMap.values()]
      .map((g) => ({
        ...g,
        eventImageUrl: g.mnoEventId ? eventImages.get(g.mnoEventId) ?? null : null,
        listingCount: g.listings.length,
        onSaleCount: g.listings.filter((l) => l.status === 'on_sale').length,
      }))
      .sort((a, b) => {
        const venueCmp = compareExeterVenueSections(a.venue, b.venue);
        if (venueCmp !== 0) return venueCmp;
        return a.eventTitle.localeCompare(b.eventTitle);
      });

    const activeListings = sellerListings.filter((t) => t.status === 'active').length;

    const soldForPayout = await prisma.nightlifeTicket.findMany({
        where: { sellerId: user.id, status: 'sold' },
        orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
        take: 40,
        select: {
          id: true,
          title: true,
          venue: true,
          price: true,
          soldAt: true,
          createdAt: true,
          payoutReleasedAt: true,
          saleAmountPence: true,
          stripePaymentIntentId: true,
        },
      });

    let pendingPence = 0;
    let readyPence = 0;
    let paidOutPence = 0;
    let lifetimePence = 0;

    const sales = soldForPayout.map((t) => {
      const soldAt = t.soldAt ?? t.createdAt;
      const amountPence = t.saleAmountPence ?? Math.round(t.price * 100);
      lifetimePence += amountPence;

      let payoutStatus: 'pending' | 'ready' | 'paid' = 'pending';
      if (t.payoutReleasedAt) {
        payoutStatus = 'paid';
        paidOutPence += amountPence;
      } else if (!t.stripePaymentIntentId) {
        payoutStatus = 'paid';
        paidOutPence += amountPence;
      } else if (isPayoutAvailable(soldAt)) {
        payoutStatus = 'ready';
        readyPence += amountPence;
      } else {
        pendingPence += amountPence;
      }

      const countdownMs = msUntilPayout(soldAt);

      return {
        id: t.id,
        title: t.title,
        venue: t.venue,
        soldAt: soldAt.toISOString(),
        amountPence,
        amountGBP: poundsFromPence(amountPence),
        payoutStatus,
        payoutAvailableAt: payoutAvailableAt(soldAt).toISOString(),
        payoutReleasedAt: t.payoutReleasedAt?.toISOString() ?? null,
        countdownLabel: t.payoutReleasedAt || !t.stripePaymentIntentId
          ? 'Paid out'
          : formatPayoutCountdown(countdownMs),
      };
    });

    return NextResponse.json({
      connectReady,
      hasConnectAccount: Boolean(dbUser?.stripeAccountId),
      holdHours: 24,
      repCode,
      repUses,
      listings,
      eventsByGroup,
      summary: {
        activeListings,
        totalSold: soldForPayout.length,
        totalListings: listings.length,
        lifetimeGBP: poundsFromPence(lifetimePence),
        pendingGBP: poundsFromPence(pendingPence),
        readyGBP: poundsFromPence(readyPence),
        paidOutGBP: poundsFromPence(paidOutPence),
      },
      sales,
    });
  } catch (err) {
    console.error('[seller-dashboard]', err);
    const raw = err instanceof Error ? err.message : '';
    const staleClientHint = /Unknown field/i.test(raw);
    const migrationHint =
      !staleClientHint &&
      /soldAt|payoutReleasedAt|saleAmountPence|mnoEventId|repCode|RepCodeUse|column.*does not exist/i.test(
        raw,
      );
    const message = staleClientHint
      ? 'App is using an old Prisma client. Stop npm run dev, run npx prisma generate, then start npm run dev again.'
      : migrationHint
        ? 'Database schema is out of date. Run npx prisma migrate deploy, then restart npm run dev.'
        : raw.trim() || 'Could not load seller dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
