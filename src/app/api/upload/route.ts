import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { getSessionUser } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limit';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
]);

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`upload:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many uploads. Please slow down.' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'File storage is not configured' },
      { status: 500 },
    );
  }

  const ext = EXT_MAP[file.type] ?? '.bin';
  const filename = `uploads/${user.id}/${randomUUID()}${ext}`;

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  });

  const type = file.type.startsWith('video/') ? 'video' : 'image';

  return NextResponse.json({
    url: blob.url,
    type,
  });
}
