#!/usr/bin/env bash
# R2 kovasına kök (/) için HTML yönlendirme nesnesi koy (Node AWS SDK ile).
set -euo pipefail
cd /var/www/tatil-villa

node <<'NODE'
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

function envGet(key) {
  const text = fs.readFileSync("/var/www/tatil-villa/.env", "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    if (k !== key) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  throw new Error("missing " + key);
}

const accountId = envGet("R2_ACCOUNT_ID");
const accessKeyId = envGet("R2_ACCESS_KEY_ID");
const secretAccessKey = envGet("R2_SECRET_ACCESS_KEY");
const bucket = envGet("R2_BUCKET");

const body = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>Yönlendiriliyor…</title>
  <meta http-equiv="refresh" content="0;url=https://www.tatildeyiz.com.tr/"/>
  <link rel="canonical" href="https://www.tatildeyiz.com.tr/"/>
  <meta name="robots" content="noindex,nofollow"/>
  <script>location.replace("https://www.tatildeyiz.com.tr/");</script>
</head>
<body>
  <p><a href="https://www.tatildeyiz.com.tr/">www.tatildeyiz.com.tr</a></p>
</body>
</html>`;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function put(key) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/html; charset=utf-8",
      CacheControl: "public, max-age=300",
    })
  );
  console.log("uploaded key=[" + key + "]");
}

(async () => {
  await put("index.html");
  try {
    await put("");
  } catch (err) {
    console.log("empty key failed:", err && err.message ? err.message : err);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

echo "--- probe / ---"
curl -sI "https://r2.tatildeyiz.com.tr/" | head -n 20
echo "--- probe /index.html ---"
curl -sI "https://r2.tatildeyiz.com.tr/index.html" | head -n 15
