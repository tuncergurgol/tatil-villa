import { readFile } from "fs/promises";
async function main() {
  const r = JSON.parse(await readFile("scripts/import-villa-images-report.json","utf8"));
  const results = r.results || [];
  const errSamples = results
    .filter((x: { status?: string }) => x.status === "error")
    .slice(0, 8)
    .map((x: { slug?: string; error?: string }) => `${x.slug}: ${x.error}`);
  console.log(JSON.stringify({ dryRun: r.options?.dryRun, summary: r.summary, errorSamples: errSamples }, null, 2));
}
main();
