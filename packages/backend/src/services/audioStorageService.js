import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.js';

export function isS3Configured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET,
  );
}

// MVP format allowlist, not real transcoding - there's no ffmpeg pipeline in
// this project yet (Dia 43), so uploads are accepted as-is or rejected, not
// normalized to a canonical format.
const ACCEPTED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]);

export function isAcceptedAudioType(mimetype) {
  return ACCEPTED_AUDIO_TYPES.has(mimetype);
}

export async function uploadAudioFile(buffer, mimetype) {
  const bucket = process.env.AWS_S3_BUCKET;
  const key = `audiobooks/${randomUUID()}`;

  await s3Client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimetype }),
  );

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
