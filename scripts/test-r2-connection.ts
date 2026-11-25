import { ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, requireR2ConfigFromEnv } from "../lib/r2-storage";

async function main() {
  const config = requireR2ConfigFromEnv();
  const client = createR2Client(config);

  try {
    const buckets = await client.send(new ListBucketsCommand({}));
    console.log(
      "ListBuckets OK:",
      buckets.Buckets?.map((bucket) => bucket.Name).join(", ")
    );
  } catch (error) {
    console.error(
      "ListBuckets FAIL:",
      error instanceof Error ? error.message : error
    );
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: "balayivillacisi.com/tours/_connectivity-test.txt",
        Body: Buffer.from("ok"),
        ContentType: "text/plain",
      })
    );
    console.log("PutObject OK");
  } catch (error) {
    console.error(
      "PutObject FAIL:",
      error instanceof Error ? error.message : error
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
