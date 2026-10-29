import { pathToFileURL } from "node:url";

// Quick parse check mirroring lib/seo-matrix.ts
const SEO_MATRIX_REGION_SLUGS = [
  "kalkan",
  "fethiye",
  "kas",
  "oludeniz",
  "islamlar",
  "bodrum",
  "marmaris",
  "dalyan",
];
const facilities = ["isitmali-havuzlu-villalar", "jakuzili-villalar"];
const slug = "kalkan-isitmali-havuzlu-villalar";
const sorted = [...facilities].sort((a, b) => b.length - a.length);
let parsed = null;
for (const facilitySlug of sorted) {
  const prefix = `-${facilitySlug}`;
  if (!slug.endsWith(prefix)) continue;
  const regionSlug = slug.slice(0, -prefix.length);
  parsed = { kind: "matrix", regionSlug, facilitySlug };
  break;
}
console.log({ parsed, regionOk: SEO_MATRIX_REGION_SLUGS.includes(parsed?.regionSlug) });
