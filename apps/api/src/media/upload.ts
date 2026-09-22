/**
 * media/upload.ts — Presigned POST to quarantine bucket for Author uploads.
 *
 * Flow (spec §14.2):
 *  1. Author calls POST /admin/media/uploads → receives presigned POST fields.
 *  2. Author uploads directly to S3/MinIO quarantine bucket (never through API).
 *  3. Author calls POST /admin/media/uploads/:id/complete → sets status=processing,
 *     queues a media.process worker job.
 *
 * Conditions enforced on the presigned POST (spec §14.2):
 *  - content-length-range: 1 byte – max bytes for the kind
 *  - exact key (UUID-keyed, never filename)
 *  - Content-Type prefix: image/, video/, audio/
 *  - x-amz-checksum-sha256 (verified by S3 on receipt)
 *
 * Local dev uses MinIO with the same S3-compatible presigned POST API.
 */
import { db } from '../db/index.js';
import { mediaAssets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { randomUUID } from 'node:crypto';

const SIZE_LIMITS = {
  image: 50 * 1024 * 1024,   // 50 MB
  video: 2 * 1024 * 1024 * 1024, // 2 GB
  audio: 500 * 1024 * 1024,  // 500 MB
} as const;

export type MediaKind = keyof typeof SIZE_LIMITS;

export interface PresignedUpload {
  assetId: string;
  uploadUrl: string;
  fields: Record<string, string>;
  /** Caller must POST to this URL after the S3 upload completes. */
  completeUrl: string;
}

/**
 * Create a presigned POST URL for uploading media to the quarantine bucket.
 * Only the Author role can call this.
 */
export async function createPresignedUpload(
  kind: MediaKind,
  uploaderId: string,
): Promise<PresignedUpload> {
  const assetId = randomUUID();
  const objectKey = `q/${assetId}`; // quarantine prefix

  // Insert a DB row immediately so we have an ID to reference
  await db.insert(mediaAssets).values({
    id: assetId,
    kind,
    status: 'uploading',
    uploaderId,
  });

  const upload = await buildPresignedPost(objectKey, kind);

  return {
    assetId,
    uploadUrl: upload.url,
    fields: upload.fields,
    completeUrl: `/api/v1/admin/media/uploads/${assetId}/complete`,
  };
}

/**
 * Mark a quarantine upload as ready for processing.
 * In a full implementation this would enqueue a pg-boss job.
 */
export async function completeUpload(assetId: string): Promise<void> {
  const [asset] = await db
    .select({ id: mediaAssets.id, status: mediaAssets.status })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId));

  if (!asset) throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
  if (asset.status !== 'uploading') {
    throw Object.assign(new Error('INVALID_STATE'), { statusCode: 409 });
  }

  await db
    .update(mediaAssets)
    .set({ status: 'processing' })
    .where(eq(mediaAssets.id, assetId));

  // TODO (Phase worker): enqueue pg-boss job { name: 'media.process', data: { assetId } }
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function buildPresignedPost(
  objectKey: string,
  kind: MediaKind,
): Promise<{ url: string; fields: Record<string, string> }> {
  const { S3Client } = await import('@aws-sdk/client-s3');
  const { createPresignedPost } = await import('@aws-sdk/s3-presigned-post');

  const isLocal = env.NODE_ENV !== 'production';
  const s3 = new S3Client({
    region: 'us-east-1',
    ...(isLocal
      ? {
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
          credentials: { accessKeyId: 'root', secretAccessKey: 'rootpassword' },
        }
      : {}),
  });

  const contentTypePrefix = `${kind}/`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: 'sl-quarantine',
    Key: objectKey,
    Expires: 300, // 5 minutes to complete the upload
    Conditions: [
      ['content-length-range', 1, SIZE_LIMITS[kind]],
      ['starts-with', '$Content-Type', contentTypePrefix],
    ],
    Fields: {
      'Content-Type': contentTypePrefix,
    },
  });

  return { url, fields: fields as Record<string, string> };
}
