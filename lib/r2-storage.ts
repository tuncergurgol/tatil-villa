import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getR2ConfigFromEnv(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() ?? "";
  const publicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL?.trim() || "https://r2.tatildeyiz.com.tr";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
  };
}

export function requireR2ConfigFromEnv(): R2Config {
  const config = getR2ConfigFromEnv();
  if (!config) {
    throw new Error(
      "R2 yapılandırması eksik. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ve R2_BUCKET tanımlayın."
    );
  }
  return config;
}

export function createR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // AWS SDK 3.729+ varsayılan CRC32 checksum R2 ile uyumsuz.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function buildR2PublicUrl(config: R2Config, objectKey: string) {
  const key = objectKey.replace(/^\/+/, "");
  return `${config.publicBaseUrl}/${key}`;
}

export function isR2PublicUrl(url: string, config?: Pick<R2Config, "publicBaseUrl">) {
  const base = trimTrailingSlash(
    config?.publicBaseUrl ?? process.env.R2_PUBLIC_BASE_URL?.trim() ?? "https://r2.tatildeyiz.com.tr"
  );
  return url.startsWith(`${base}/`);
}

export async function uploadBufferToR2(input: {
  config?: R2Config;
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  const config = input.config ?? requireR2ConfigFromEnv();
  const client = createR2Client(config);
  const key = input.objectKey.replace(/^\/+/, "");

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );

  return buildR2PublicUrl(config, key);
}

export function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export function buildTourImageObjectKey(fileName: string, sitePrefix = "balayivillacisi.com") {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${sitePrefix}/tours/${safeName}`;
}

export function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split("/").filter(Boolean).pop() ?? "image.webp";
    return decodeURIComponent(base);
  } catch {
    return "image.webp";
  }
}
