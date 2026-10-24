import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { getInboxThread, patchInboxThreads } from '@/lib/admin-inbox';
import { publicErrorMessage } from '@/lib/security';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threadId } = await params;
  const thread = await getInboxThread(threadId);
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { threadId } = await params;
    const body = (await request.json()) as {
      read?: unknown;
      starred?: unknown;
      archived?: unknown;
      trashed?: unknown;
    };
    await patchInboxThreads([threadId], {
      read: typeof body.read === 'boolean' ? body.read : undefined,
      starred: typeof body.starred === 'boolean' ? body.starred : undefined,
      archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      trashed: typeof body.trashed === 'boolean' ? body.trashed : undefined,
    });
    const thread = await getInboxThread(threadId);
    return NextResponse.json({ thread });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Could not update thread') },
      { status: 400 },
    );
  }
}
