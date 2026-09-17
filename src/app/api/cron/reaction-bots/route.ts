import { NextRequest, NextResponse } from 'next/server';
import { runReactionBotTick } from '@/lib/reaction-bot-engine';

function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === 'development';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runReactionBotTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/reaction-bots]', err);
    return NextResponse.json({ error: 'Tick failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
