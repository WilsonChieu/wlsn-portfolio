import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 600;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const publicBucket = () => env("R2_PUBLIC_BUCKET");

let client: S3Client | undefined;

function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    // Newer SDKs add CRC32 checksums to every upload by default, which R2 presigned
    // browser uploads can't satisfy; only send them when an operation requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function isNotFound(err: unknown): boolean {
  return (
    err instanceof S3ServiceException &&
    (err.name === "NoSuchKey" || err.name === "NotFound" || err.$metadata.httpStatusCode === 404)
  );
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: publicBucket(), Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function putJson(key: string, data: unknown): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: publicBucket(),
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      CacheControl: "no-store",
    })
  );
}

export async function putObject(bucket: string, key: string, body: Uint8Array, contentType: string): Promise<void> {
  await r2().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

// Signing ContentLength makes R2 reject a PUT of any other size, so the storage guard can trust the sizes it checked.
export function presignPut(bucket: string, key: string, contentType: string, contentLength: number): Promise<string> {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }), {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

export async function deletePrefix(bucket: string, prefix: string): Promise<void> {
  for (;;) {
    const page = await r2().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length === 0) return;
    const res = await r2().send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }));
    if (res.Errors?.length) throw new Error(`Could not delete ${res.Errors.length} objects under ${prefix}`);
  }
}

export async function bucketUsageBytes(): Promise<number> {
  let total = 0;
  let token: string | undefined;
  do {
    const page = await r2().send(new ListObjectsV2Command({ Bucket: publicBucket(), ContinuationToken: token }));
    for (const object of page.Contents ?? []) total += object.Size ?? 0;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return total;
}
