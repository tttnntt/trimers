import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET || 'trimers';
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT;
const USE_SSL = process.env.S3_USE_SSL !== 'false';

const client = new S3Client({
  region: REGION,
  ...(ENDPOINT && {
    endpoint: ENDPOINT,
    forcePathStyle: true
  }),
  credentials: process.env.S3_ACCESS_KEY_ID ? {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  } : undefined
});

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function getPublicUrl(key: string): string {
  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
