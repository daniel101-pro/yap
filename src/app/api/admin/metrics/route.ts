import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { getAdminMetrics, serializeAdminMetrics } from '@/lib/admin-metrics';

export async function GET(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scope = request.nextUrl.searchParams.get('scope');
  const metrics = await getAdminMetrics();

  if (scope === 'badges') {
    return NextResponse.json({
      badges: metrics.badges,
      updatedAt: metrics.updatedAt,
    });
  }

  return NextResponse.json(serializeAdminMetrics(metrics));
}
