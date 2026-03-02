import sharp from 'sharp';
import { uploadObject } from './s3.js';
import { randomUUID } from 'crypto';

const MAX_DIMENSION = 2048;
const QUALITY = 100;

export async function compressAndUpload(buffer: Buffer, mimeType: string): Promise<string> {
  const metadata = await sharp(buffer).metadata();
  const format = mimeType.includes('png') ? 'png' : 'jpeg';

  let pipeline = sharp(buffer);

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  const output = format === 'png'
    ? await pipeline.png({ quality: QUALITY }).toBuffer()
    : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

  const key = `uploads/${randomUUID()}.${format === 'png' ? 'png' : 'jpg'}`;
  const contentType = format === 'png' ? 'image/png' : 'image/jpeg';

  await uploadObject(key, output, contentType);
  return key;
}
