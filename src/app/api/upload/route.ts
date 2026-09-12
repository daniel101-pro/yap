import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { getSessionUser } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limit';
import { detectMediaType, sanitizeUploadBytes } from '@/lib/media-safety';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(Object.keys(EXT_MAP));

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

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
  }

  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectMediaType(rawBytes);
  if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'File storage is not configured' },
      { status: 500 },
    );
  }

  const bytes = sanitizeUploadBytes(detectedType, rawBytes);
  const ext = EXT_MAP[detectedType] ?? '.bin';
  const filename = `uploads/${user.id}/${randomUUID()}${ext}`;
  const blob = await put(filename, Buffer.from(bytes), {
    access: 'public',
    contentType: detectedType,
  });

  const type = detectedType.startsWith('video/') ? 'video' : 'image';

  return NextResponse.json({
    url: blob.url,
    type,
  });
}
