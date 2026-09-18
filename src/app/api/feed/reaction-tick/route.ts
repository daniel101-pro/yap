import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limit';
import { runReactionBotTick } from '@/lib/reaction-bot-engine';

/** Session-gated drip so reactions still land when Vercel cron is daily-only. */
export async function POST() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit('reaction-bot-tick-global', 1, 35 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await runReactionBotTick({ catchUp: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[reaction-tick]', err);
    return NextResponse.json({ error: 'Tick failed' }, { status: 500 });
  }
}
