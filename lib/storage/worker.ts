/**
 * Storage helpers for non-Next.js contexts (the pg-boss worker, scripts).
 * Same bucket and env vars as lib/storage/index.ts, without the "server-only"
 * import that throws in standalone Bun processes.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export const WORKER_MEDIA_BUCKET = process.env.BUCKET_MEDIA_NAME ?? "media";

export function getWorkerStorageClient(): S3Client {
  if (_client) return _client;
  const endpoint = process.env.BUCKET_ENDPOINT;
  const accessKeyId = process.env.BUCKET_MEDIA_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BUCKET_MEDIA_SECRET_ACCESS_KEY;
  if (!endpoint) throw new Error("BUCKET_ENDPOINT is not set");
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("BUCKET_MEDIA_ACCESS_KEY_ID / BUCKET_MEDIA_SECRET_ACCESS_KEY are not set");
  }
  _client = new S3Client({
    endpoint,
    region: process.env.BUCKET_REGION ?? "auto",
    forcePathStyle: process.env.BUCKET_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function workerUploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getWorkerStorageClient().send(
    new PutObjectCommand({
      Bucket: WORKER_MEDIA_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function workerDownloadFile(key: string): Promise<Buffer> {
  const res = await getWorkerStorageClient().send(
    new GetObjectCommand({ Bucket: WORKER_MEDIA_BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error(`Empty storage object: ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function workerDeleteFile(key: string): Promise<void> {
  await getWorkerStorageClient().send(
    new DeleteObjectCommand({ Bucket: WORKER_MEDIA_BUCKET, Key: key }),
  );
}
