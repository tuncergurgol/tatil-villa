/**
 * Match our Villa.documentNo against villakalkan.com.tr
 * (sitemap index → *-kiralik-villa-{id} + window.__NUXT__ componentData.document_no).
 *
 *   npx tsx scripts/match-villakalkan-by-document.ts
 *   npx tsx scripts/match-villakalkan-by-document.ts --limit=50
 *   npx tsx scripts/match-villakalkan-by-document.ts --resume
 *   npx tsx scripts/match-villakalkan-by-document.ts --concurrency=2 --delay-ms=500
 *   npx tsx scripts/match-villakalkan-by-document.ts --match-only
 *
 * Outputs:
 *   scripts/villakalkan-match-report.json
 *   scripts/villakalkan-match-report.csv
 *   scripts/villakalkan-match-report.xlsx
 *   scripts/villakalkan-catalog-cache.json
 *   Desktop: villakalkan-eslestirme.xlsx
 */
import { copyFileSync, createWriteStream, existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";

const BASE = "https://www.villakalkan.com.tr";
const SITEMAP_BASE = "https://villakalkan.com.tr";
const CACHE_PATH = "scripts/villakalkan-catalog-cache.json";
const REPORT_JSON = "scripts/villakalkan-match-report.json";
const REPORT_CSV = "scripts/villakalkan-match-report.csv";
const REPORT_XLSX = "scripts/villakalkan-match-report.xlsx";
const DESKTOP_XLSX = join(
  process.env.USERPROFILE || join(homedir()),
  "OneDrive",
  "Desktop",
  "villakalkan-eslestirme.xlsx"
);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const VILLA_PATH_RE = /^\/[a-z0-9]+-kiralik-villa-\d+$/i;

type CatalogEntry = {
  url: string;
  slug: string;
  name: string;
  belgeNo: string;
  entityId: string;
  fetchStatus: "ok" | "error" | "skip";
  error?: string;
};

type OurVilla = {
  id: string;
  villaId: number | null;
  name: string;
  originalName: string;
  slug: string;
  documentNo: string;
  active: boolean;
};

type MatchConfidence = "exact" | "fuzzy" | "none" | "ambiguous";

type MatchRow = {
  ourVillaId: string;
  ourNumericVillaId: number | null;
  belgeNo: string;
  ourName: string;
  ourOriginalName: string;
  ourSlug: string;
  ourActive: boolean;
  externalUrl: string;
  externalSlug: string;
  externalName: string;
  externalBelgeNo: string;
  matchConfidence: MatchConfidence;
  matchNote: string;
};

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize tourism belge numbers for comparison. */
function normalizeBelge(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^0-9./-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bvilla\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(raw: string): Set<string> {
  const n = normalizeName(raw);
  return new Set(n.split(" ").filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function slugSimilarity(a: string, b: string): number {
  const na = normalizeName(a.replace(/-/g, " "));
  const nb = normalizeName(b.replace(/-/g, " "));
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  return jaccard(new Set(na.split(" ")), new Set(nb.split(" ")));
}

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  return { status: res.status, text: await res.text() };
}

function parseNuxtPayload(html: string): any | null {
  const m = html.match(/window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
  if (!m?.[1]) return null;
  const expr = m[1].trim().replace(/;+\s*$/, "");
  try {
    return Function(`"use strict"; return ${expr}`)();
  } catch {
    return null;
  }
}

function coerceBelgeNo(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw === 0) return "";
    return String(raw);
  }
  const s = String(raw).trim();
  if (!s || s === "0") return "";
  return s;
}

function parseCatalogFromHtml(url: string, html: string): CatalogEntry {
  const path = new URL(url).pathname.replace(/\/$/, "");
  const slug = path.replace(/^\//, "");
  const idMatch = slug.match(/-(\d+)$/);
  const entityId = idMatch?.[1] || "";

  if (!VILLA_PATH_RE.test(path)) {
    return {
      url,
      slug,
      name: "",
      belgeNo: "",
      entityId,
      fetchStatus: "skip",
      error: "not villa detail path",
    };
  }

  const nuxt = parseNuxtPayload(html);
  const cd = nuxt?.data?.[0]?.componentData;
  if (!cd) {
    return {
      url,
      slug,
      name: "",
      belgeNo: "",
      entityId,
      fetchStatus: "error",
      error: "no __NUXT__ componentData",
    };
  }

  const name = String(cd.name || "").trim() || slug;
  const belgeNo = coerceBelgeNo(cd.document_no);
  const code = cd.code != null ? String(cd.code) : entityId;

  return {
    url: url.replace(/\/$/, ""),
    slug,
    name,
    belgeNo,
    entityId: code,
    fetchStatus: "ok",
  };
}

function normalizeVillaUrl(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.protocol = "https:";
    parsed.hostname = "www.villakalkan.com.tr";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return u.replace(/\/$/, "");
  }
}

async function loadSitemapVillaUrls(): Promise<string[]> {
  const indexUrl = `${SITEMAP_BASE}/sitemap.xml`;
  const { status, text } = await fetchText(indexUrl);
  if (status !== 200) {
    throw new Error(`sitemap index fetch failed: ${status}`);
  }

  const indexLocs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  const childSitemaps = indexLocs.filter((u) => /sitemap_group_\d+\.xml/i.test(u));

  const urls: string[] = [];
  if (childSitemaps.length > 0) {
    for (const sm of childSitemaps) {
      const r = await fetchText(sm);
      if (r.status !== 200) {
        console.warn(`sitemap fetch failed ${sm}: ${r.status}`);
        continue;
      }
      for (const m of r.text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        urls.push(m[1]!);
      }
      await sleep(200);
    }
  } else {
    urls.push(...indexLocs);
  }

  const villas = urls.filter((u) => {
    try {
      const path = new URL(u).pathname.replace(/\/$/, "");
      return VILLA_PATH_RE.test(path);
    } catch {
      return false;
    }
  });

  return [...new Set(villas.map(normalizeVillaUrl))];
}

function loadCache(): Record<string, CatalogEntry> {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as {
      entries?: CatalogEntry[];
    };
    const map: Record<string, CatalogEntry> = {};
    for (const e of parsed.entries ?? []) {
      map[e.url.replace(/\/$/, "")] = e;
    }
    return map;
  } catch {
    return {};
  }
}

function saveCache(map: Record<string, CatalogEntry>) {
  const entries = Object.values(map).sort((a, b) => a.slug.localeCompare(b.slug));
  writeFileSync(
    CACHE_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: entries.length,
        okCount: entries.filter((e) => e.fetchStatus === "ok").length,
        entries,
      },
      null,
      2
    )
  );
}

async function scrapeCatalog(opts: {
  resume: boolean;
  limit?: number;
  concurrency: number;
  delayMs: number;
}): Promise<CatalogEntry[]> {
  const urls = await loadSitemapVillaUrls();
  console.log(`Sitemap villa URLs: ${urls.length}`);

  const cache = opts.resume ? loadCache() : {};
  const pending = urls.filter((u) => {
    const cached = cache[u];
    return !(cached && cached.fetchStatus === "ok");
  });
  const work = opts.limit ? pending.slice(0, opts.limit) : pending;
  console.log(
    `To fetch: ${work.length} (cache ok: ${Object.values(cache).filter((e) => e.fetchStatus === "ok").length}, resume=${opts.resume})`
  );

  let done = 0;
  let errors = 0;

  async function worker(batch: string[]) {
    for (const url of batch) {
      try {
        const { status, text } = await fetchText(url);
        if (status !== 200) {
          cache[url] = {
            url,
            slug: url.split("/").pop() || "",
            name: "",
            belgeNo: "",
            entityId: "",
            fetchStatus: "error",
            error: `HTTP ${status}`,
          };
          errors += 1;
        } else {
          cache[url] = parseCatalogFromHtml(url, text);
          if (cache[url].fetchStatus === "error") errors += 1;
        }
      } catch (e) {
        cache[url] = {
          url,
          slug: url.split("/").pop() || "",
          name: "",
          belgeNo: "",
          entityId: "",
          fetchStatus: "error",
          error: e instanceof Error ? e.message : String(e),
        };
        errors += 1;
      }
      done += 1;
      if (done % 25 === 0 || done === work.length) {
        saveCache(cache);
        console.log(
          `  progress ${done}/${work.length} (errors=${errors}, cache=${Object.keys(cache).length})`
        );
      }
      await sleep(opts.delayMs);
    }
  }

  const chunks: string[][] = Array.from({ length: opts.concurrency }, () => []);
  work.forEach((u, i) => chunks[i % opts.concurrency]!.push(u));
  await Promise.all(chunks.map((c) => worker(c)));
  saveCache(cache);

  return Object.values(cache).filter((e) => e.fetchStatus === "ok");
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const ROW_HEADERS: (keyof MatchRow)[] = [
  "ourVillaId",
  "ourNumericVillaId",
  "belgeNo",
  "ourName",
  "ourOriginalName",
  "ourSlug",
  "ourActive",
  "externalUrl",
  "externalSlug",
  "externalName",
  "externalBelgeNo",
  "matchConfidence",
  "matchNote",
];

function writeCsv(rows: MatchRow[]) {
  const stream = createWriteStream(REPORT_CSV, { encoding: "utf8" });
  stream.write("\uFEFF" + ROW_HEADERS.join(",") + "\n");
  for (const row of rows) {
    stream.write(ROW_HEADERS.map((h) => csvEscape(row[h])).join(",") + "\n");
  }
  stream.end();
}

function writeXlsx(rows: MatchRow[], summary: Record<string, unknown>) {
  const wb = XLSX.utils.book_new();
  const sheetRows = rows.map((r) => {
    const out: Record<string, string | number | boolean | null> = {};
    for (const h of ROW_HEADERS) out[h] = r[h];
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows, { header: [...ROW_HEADERS] });
  XLSX.utils.book_append_sheet(wb, ws, "Eslestirme");

  const summaryRows = Object.entries(summary).flatMap(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.entries(v as Record<string, unknown>).map(([sk, sv]) => ({
        key: `${k}.${sk}`,
        value: String(sv),
      }));
    }
    return [{ key: k, value: String(v) }];
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "Ozet"
  );

  XLSX.writeFile(wb, REPORT_XLSX);
  try {
    copyFileSync(REPORT_XLSX, DESKTOP_XLSX);
  } catch (e) {
    console.warn(
      `Desktop kopyası yazılamadı (${DESKTOP_XLSX}):`,
      e instanceof Error ? e.message : e
    );
  }
}

function buildMatches(ours: OurVilla[], catalog: CatalogEntry[]): MatchRow[] {
  const byBelge = new Map<string, CatalogEntry[]>();
  for (const e of catalog) {
    const key = normalizeBelge(e.belgeNo);
    if (!key) continue;
    const list = byBelge.get(key) ?? [];
    list.push(e);
    byBelge.set(key, list);
  }

  const bySlug = new Map<string, CatalogEntry>();
  for (const e of catalog) {
    bySlug.set(e.slug.toLowerCase(), e);
  }

  const usedUrls = new Set<string>();
  const rows: MatchRow[] = [];

  for (const villa of ours) {
    const belge = villa.documentNo.trim();
    const belgeKey = normalizeBelge(belge);

    if (belgeKey) {
      const hits = byBelge.get(belgeKey) ?? [];
      if (hits.length === 1) {
        const hit = hits[0]!;
        usedUrls.add(hit.url);
        rows.push({
          ourVillaId: villa.id,
          ourNumericVillaId: villa.villaId,
          belgeNo: belge,
          ourName: villa.name,
          ourOriginalName: villa.originalName,
          ourSlug: villa.slug,
          ourActive: villa.active,
          externalUrl: hit.url,
          externalSlug: hit.slug,
          externalName: hit.name,
          externalBelgeNo: hit.belgeNo,
          matchConfidence: "exact",
          matchNote: "documentNo == villakalkan document_no",
        });
        continue;
      }
      if (hits.length > 1) {
        for (const hit of hits) usedUrls.add(hit.url);
        rows.push({
          ourVillaId: villa.id,
          ourNumericVillaId: villa.villaId,
          belgeNo: belge,
          ourName: villa.name,
          ourOriginalName: villa.originalName,
          ourSlug: villa.slug,
          ourActive: villa.active,
          externalUrl: hits.map((h) => h.url).join(" | "),
          externalSlug: hits.map((h) => h.slug).join(" | "),
          externalName: hits.map((h) => h.name).join(" | "),
          externalBelgeNo: hits.map((h) => h.belgeNo).join(" | "),
          matchConfidence: "ambiguous",
          matchNote: `${hits.length} villakalkan pages share this belgeNo`,
        });
        continue;
      }
    }

    const slugHit = bySlug.get(villa.slug.toLowerCase());
    if (slugHit && !usedUrls.has(slugHit.url)) {
      const theirs = normalizeBelge(slugHit.belgeNo);
      if (belgeKey && theirs && belgeKey !== theirs) {
        usedUrls.add(slugHit.url);
        rows.push({
          ourVillaId: villa.id,
          ourNumericVillaId: villa.villaId,
          belgeNo: belge,
          ourName: villa.name,
          ourOriginalName: villa.originalName,
          ourSlug: villa.slug,
          ourActive: villa.active,
          externalUrl: slugHit.url,
          externalSlug: slugHit.slug,
          externalName: slugHit.name,
          externalBelgeNo: slugHit.belgeNo,
          matchConfidence: "ambiguous",
          matchNote: `slug exact but belge differs (ours=${belge}, theirs=${slugHit.belgeNo})`,
        });
        continue;
      }
      usedUrls.add(slugHit.url);
      rows.push({
        ourVillaId: villa.id,
        ourNumericVillaId: villa.villaId,
        belgeNo: belge,
        ourName: villa.name,
        ourOriginalName: villa.originalName,
        ourSlug: villa.slug,
        ourActive: villa.active,
        externalUrl: slugHit.url,
        externalSlug: slugHit.slug,
        externalName: slugHit.name,
        externalBelgeNo: slugHit.belgeNo,
        matchConfidence: "fuzzy",
        matchNote: belgeKey
          ? `slug exact; belge ours=${belge} theirs=${slugHit.belgeNo || "-"}`
          : "slug exact (no our belgeNo)",
      });
      continue;
    }

    let bestOk: { entry: CatalogEntry; score: number; why: string } | null = null;
    let bestConflict: { entry: CatalogEntry; score: number; why: string } | null =
      null;
    const ourTokens = tokenize(`${villa.name} ${villa.originalName}`);
    for (const e of catalog) {
      if (usedUrls.has(e.url)) continue;
      const theirs = normalizeBelge(e.belgeNo);
      const nameScore = Math.max(
        jaccard(ourTokens, tokenize(e.name)),
        jaccard(tokenize(villa.name), tokenize(e.name)),
        jaccard(tokenize(villa.originalName), tokenize(e.name))
      );
      const slugScore = Math.max(
        slugSimilarity(villa.slug, e.slug),
        slugSimilarity(villa.name, e.slug),
        slugSimilarity(villa.originalName, e.slug),
        slugSimilarity(villa.slug, e.name),
        slugSimilarity(villa.name, e.name)
      );
      const score = Math.max(nameScore, slugScore);
      const conflict = Boolean(belgeKey && theirs && belgeKey !== theirs);
      if (conflict) {
        if (!bestConflict || score > bestConflict.score) {
          bestConflict = {
            entry: e,
            score,
            why: `name/slug score=${score.toFixed(2)}`,
          };
        }
      } else if (!bestOk || score > bestOk.score) {
        bestOk = {
          entry: e,
          score,
          why: `name/slug score=${score.toFixed(2)}`,
        };
      }
    }

    if (bestOk && bestOk.score >= 0.72) {
      usedUrls.add(bestOk.entry.url);
      rows.push({
        ourVillaId: villa.id,
        ourNumericVillaId: villa.villaId,
        belgeNo: belge,
        ourName: villa.name,
        ourOriginalName: villa.originalName,
        ourSlug: villa.slug,
        ourActive: villa.active,
        externalUrl: bestOk.entry.url,
        externalSlug: bestOk.entry.slug,
        externalName: bestOk.entry.name,
        externalBelgeNo: bestOk.entry.belgeNo,
        matchConfidence: "fuzzy",
        matchNote: belgeKey
          ? `${bestOk.why}; belge ours=${belge} theirs=${bestOk.entry.belgeNo || "-"}`
          : bestOk.why,
      });
      continue;
    }

    if (bestConflict && bestConflict.score >= 0.85) {
      usedUrls.add(bestConflict.entry.url);
      rows.push({
        ourVillaId: villa.id,
        ourNumericVillaId: villa.villaId,
        belgeNo: belge,
        ourName: villa.name,
        ourOriginalName: villa.originalName,
        ourSlug: villa.slug,
        ourActive: villa.active,
        externalUrl: bestConflict.entry.url,
        externalSlug: bestConflict.entry.slug,
        externalName: bestConflict.entry.name,
        externalBelgeNo: bestConflict.entry.belgeNo,
        matchConfidence: "ambiguous",
        matchNote: `${bestConflict.why} but belge differs (ours=${belge}, theirs=${bestConflict.entry.belgeNo})`,
      });
      continue;
    }

    rows.push({
      ourVillaId: villa.id,
      ourNumericVillaId: villa.villaId,
      belgeNo: belge,
      ourName: villa.name,
      ourOriginalName: villa.originalName,
      ourSlug: villa.slug,
      ourActive: villa.active,
      externalUrl: "",
      externalSlug: "",
      externalName: "",
      externalBelgeNo: "",
      matchConfidence: "none",
      matchNote: belgeKey
        ? bestConflict
          ? `belge not found; closest name ${bestConflict.why} (belge conflict)`
          : bestOk
            ? `no reliable match (best ${bestOk.why})`
            : "belge not found on villakalkan"
        : "no belgeNo and no fuzzy match",
    });
  }

  return rows;
}

async function main() {
  const resume =
    process.argv.includes("--resume") || !process.argv.includes("--fresh");
  const limit = argValue("limit") ? Number(argValue("limit")) : undefined;
  // Gentle defaults: site is Nuxt + Cloudflare
  const concurrency = Number(argValue("concurrency") ?? "2");
  const delayMs = Number(argValue("delay-ms") ?? "500");
  const onlyWithBelge = !process.argv.includes("--all-ours");

  console.log(
    `Config: resume=${resume}, limit=${limit ?? "all"}, concurrency=${concurrency}, delayMs=${delayMs}, onlyWithBelge=${onlyWithBelge}`
  );

  const matchOnly = process.argv.includes("--match-only");
  let catalog: CatalogEntry[];
  if (matchOnly) {
    const cache = loadCache();
    catalog = Object.values(cache).filter((e) => e.fetchStatus === "ok");
    console.log(`Match-only from cache: ${catalog.length} entries`);
  } else {
    catalog = await scrapeCatalog({ resume, limit, concurrency, delayMs });
  }
  console.log(
    `Catalog ready: ${catalog.length} product pages (with belge: ${catalog.filter((c) => c.belgeNo).length})`
  );

  const ours = (await prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      originalName: true,
      slug: true,
      documentNo: true,
      active: true,
    },
    orderBy: { villaId: "asc" },
  })) as OurVilla[];

  const oursForReport = onlyWithBelge
    ? ours.filter((v) => v.documentNo.trim())
    : ours;

  const rows = buildMatches(oursForReport, catalog);

  const exact = rows.filter((r) => r.matchConfidence === "exact").length;
  const fuzzy = rows.filter((r) => r.matchConfidence === "fuzzy").length;
  const ambiguous = rows.filter((r) => r.matchConfidence === "ambiguous").length;
  const none = rows.filter((r) => r.matchConfidence === "none").length;

  const summary = {
    generatedAt: new Date().toISOString(),
    source: BASE,
    ourTotal: ours.length,
    ourWithBelge: ours.filter((v) => v.documentNo.trim()).length,
    ourInReport: oursForReport.length,
    externalCatalog: catalog.length,
    externalWithBelge: catalog.filter((c) => c.belgeNo.trim()).length,
    matches: {
      exact,
      fuzzy,
      ambiguous,
      none,
      matched: exact + fuzzy,
    },
  };

  writeFileSync(REPORT_JSON, JSON.stringify({ summary, rows }, null, 2));
  writeCsv(rows);
  writeXlsx(rows, summary);

  console.log("\n=== ÖZET ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nJSON: ${REPORT_JSON}`);
  console.log(`CSV:  ${REPORT_CSV}`);
  console.log(`XLSX:${REPORT_XLSX}`);
  console.log(`Desktop: ${DESKTOP_XLSX}`);
  console.log(`Cache:${CACHE_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
