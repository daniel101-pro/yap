const MAGIC: Array<{ type: string; test: (bytes: Uint8Array) => boolean }> = [
  { type: 'image/jpeg', test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    test: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    type: 'image/gif',
    test: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  {
    type: 'image/webp',
    test: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    type: 'video/mp4',
    test: (b) =>
      b.length >= 12 &&
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70,
  },
];

export function detectMediaType(bytes: Uint8Array): string | null {
  for (const entry of MAGIC) {
    if (entry.test(bytes)) return entry.type;
  }
  return null;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Drop JPEG APP1 (EXIF/XMP) segments so GPS and device tags are not stored. */
export function stripJpegExif(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return data;

  const chunks: Uint8Array[] = [data.subarray(0, 2)];
  let i = 2;

  while (i + 1 < data.length) {
    if (data[i] !== 0xff) {
      chunks.push(data.subarray(i));
      break;
    }

    const marker = data[i + 1];
    if (marker === 0xda) {
      chunks.push(data.subarray(i));
      break;
    }

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(data.subarray(i, i + 2));
      i += 2;
      continue;
    }

    if (i + 3 >= data.length) {
      chunks.push(data.subarray(i));
      break;
    }

    const length = (data[i + 2] << 8) + data[i + 3];
    if (length < 2 || i + 2 + length > data.length) {
      chunks.push(data.subarray(i));
      break;
    }

    if (marker === 0xe1) {
      i += 2 + length;
      continue;
    }

    chunks.push(data.subarray(i, i + 2 + length));
    i += 2 + length;
  }

  return concat(chunks);
}

export function sanitizeUploadBytes(detectedType: string, bytes: Uint8Array): Uint8Array {
  if (detectedType === 'image/jpeg') return stripJpegExif(bytes);
  return bytes;
}
