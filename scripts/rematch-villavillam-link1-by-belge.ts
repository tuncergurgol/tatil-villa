/**
 * villavillam.com.tr LINK1'li villaları, aynı belge no (gavelBelgeNo) ile
 * çalışan villa-API ailesi sitelerinde arar; LINK1'i günceller ve sync eder.
 *
 * Öncelik (sunucudan erişilebilir):
 *   villayolu.com → ovillam.com → tatilpremium.com → villapaketi.com
 *
 *   npx tsx scripts/rematch-villavillam-link1-by-belge.ts --dry-run
 *   npx tsx scripts/rematch-villavillam-link1-by-belge.ts --build-only
 *   npx tsx scripts/rematch-villavillam-link1-by-belge.ts --apply --sync
 *   npx tsx scripts/rematch-villavillam-link1-by-belge.ts --apply --sync --limit=20
 *   npx tsx scripts/rematch-villavillam-link1-by-belge.ts --resume
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CACHE_PATH = "scripts/villa-api-family-belge-catalog.json";
const REPORT_PATH = "scripts/villavillam-link1-rematch-report.json";

type SisterSite = {
  key: string;
  origin: string;
  sitemapSeeds: string[];
  priority: number;
};

/** Sunucudan HTML+API erişimi doğrulanmış aile üyeleri (öncelik sırası). */
const SITES: SisterSite[] = [
  {
    key: "villayolu",
    origin: "https://www.villayolu.com",
    sitemapSeeds: ["https://www.villayolu.com/sitemap.xml"],
    priority: 1,
  },
  {
    key: "ovillam",
    origin: "https://www.ovillam.com",
    sitemapSeeds: [
      "https://www.ovillam.com/sitemap.xml",
      "https://www.ovillam.com/sitemap-products-1.xml",
    ],
    priority: 2,
  },
  {
    key: "tatilpremium",
    origin: "https://www.tatilpremium.com",
    sitemapSeeds: ["https://www.tatilpremium.com/sitemap.xml"],
    priority: 3,
  },
  {
    key: "villapaketi",
    origin: "https://www.villapaketi.com",
    sitemapSeeds: [
      "https://www.villapaketi.com/sitemap.xml",
      "https://www.villapaketi.com/ilan-detay-sitemap.xml",
    ],
    priority: 4,
  },
];

type CatalogEntry = {
  siteKey: string;
  url: string;
  slug: string;
  name: string;
  belgeNo: string;
  belgeNorm: string;
  entityId: string;
  fetchStatus: "ok" | "error" | "skip";
  error?: string;
};

type MatchRow = {
  villaDbId: string;
  villaId: number | null;
  name: string;
  slug: string;
  documentNo: string;
  oldLink1: string;
  newLink1: string | null;
  matchSite: string | null;
  matchName: string | null;
  matchEntityId: string | null;
  matchConfidence: "exact" | "none" | "ambiguous";
  note: string;
  syncOk?: boolean;
  syncMessage?: string;
  periodsAfter?: number;
};

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

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

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  return { status: res.status, text: await res.text() };
}

function isVillaPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "");
  if (!path || path === "/") return false;
  const leaf = path.split("/").filter(Boolean).pop() || "";
  if (!leaf) return false;
  if (/^(bolgeler|destek|blog|iletisim|hakkimizda|villa-secenekleri|kategoriler)$/i.test(leaf)) {
    return false;
  }
  // /Villa-Betul, /villa-monalisa, /villa-xxx-1
  return /^villa[-_a-z0-9]+$/i.test(leaf) || /^[A-Z][A-Za-z0-9-]*$/.test(leaf);
}

async function collectSitemapUrls(seeds: string[]): Promise<string[]> {
  const found = new Set<string>();
  const queue = [...seeds];
  const seenMaps = new Set<string>();

  while (queue.length > 0) {
    const mapUrl = queue.shift()!;
    if (seenMaps.has(mapUrl)) continue;
    seenMaps.add(mapUrl);
    try {
      const { status, text } = await fetchText(mapUrl);
      if (status !== 200) continue;
      const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) =>
        m[1]!.trim()
      );
      for (const loc of locs) {
        if (/sitemap.*\.xml/i.test(loc) || /sitemap/i.test(loc.split("/").pop() || "")) {
          if (!seenMaps.has(loc)) queue.push(loc);
          continue;
        }
        try {
          const u = new URL(loc);
          if (isVillaPath(u.pathname)) {
            found.add(u.toString().replace(/\/$/, ""));
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore sitemap errors
    }
    await sleep(120);
  }
  return [...found];
}

function parseCatalogEntry(
  site: SisterSite,
  pageUrl: string,
  html: string
): CatalogEntry {
  const slug =
    new URL(pageUrl).pathname.split("/").filter(Boolean).pop()?.replace(/\/$/, "") ||
    "";

  // routingData id + url (slug eşleşmeli)
  let entityId = "";
  const routingRe =
    /routingData\\":\{\\"id\\":\\"(\d+)\\"[^\}]{0,500}?\\"url\\":\\"(\/[^\\"]+)\\"/gi;
  let m: RegExpExecArray | null;
  while ((m = routingRe.exec(html)) !== null) {
    const urlSlug = (m[2] || "").split("/").filter(Boolean).pop() || "";
    if (urlSlug.localeCompare(slug, undefined, { sensitivity: "accent" }) === 0) {
      entityId = m[1] || "";
      break;
    }
  }

  // __NEXT_DATA__ fallback
  if (!entityId) {
    const next = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
    );
    if (next?.[1]) {
      try {
        const data = JSON.parse(next[1]);
        const result = data?.props?.pageProps?.data?.result;
        if (result?.id) entityId = String(result.id);
      } catch {
        // ignore
      }
    }
  }

  // baslik + id yakınlığı
  let name = "";
  const nameMatch = html.match(/\\"baslik\\":\\"([^\\"]+)\\"/);
  if (nameMatch?.[1]) name = nameMatch[1];
  if (!name && entityId) {
    const idName = html.match(
      new RegExp(`\\\\"id\\\\":\\\\"${entityId}\\\\",\\\\"baslik\\\\":\\\\"([^\\\\"]+)\\\\"`)
    );
    if (idName?.[1]) name = idName[1];
  }

  const belgeMatch = html.match(/gavelBelgeNo\\*":\\*"([^"\\]+)/);
  const belgeNo = (belgeMatch?.[1] || "").trim();
  const belgeNorm = normalizeBelge(belgeNo);

  if (!belgeNorm || !entityId) {
    return {
      siteKey: site.key,
      url: pageUrl,
      slug,
      name,
      belgeNo,
      belgeNorm,
      entityId,
      fetchStatus: "skip",
      error: !entityId ? "entityId yok" : "belge yok",
    };
  }

  return {
    siteKey: site.key,
    url: pageUrl,
    slug,
    name,
    belgeNo,
    belgeNorm,
    entityId,
    fetchStatus: "ok",
  };
}

async function buildCatalog(options: {
  resume: boolean;
  delayMs: number;
  concurrency: number;
  siteFilter?: string;
}): Promise<CatalogEntry[]> {
  let existing: CatalogEntry[] = [];
  if (options.resume && existsSync(CACHE_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as {
        entries?: CatalogEntry[];
      };
      existing = parsed.entries || [];
      console.log(`cache yüklendi: ${existing.length} kayıt`);
    } catch {
      existing = [];
    }
  }
  const byUrl = new Map(existing.map((e) => [e.url.replace(/\/$/, ""), e]));

  for (const site of SITES) {
    if (options.siteFilter && site.key !== options.siteFilter) continue;
    console.log(`\n==> sitemap: ${site.key}`);
    const urls = await collectSitemapUrls(site.sitemapSeeds);
    console.log(`   villa url: ${urls.length}`);

    let i = 0;
    const pending = urls.filter((u) => {
      const prev = byUrl.get(u.replace(/\/$/, ""));
      return !(prev && prev.fetchStatus === "ok" && options.resume);
    });
    console.log(`   çekilecek: ${pending.length}`);

    async function worker() {
      while (i < pending.length) {
        const idx = i++;
        const url = pending[idx]!;
        try {
          const { status, text } = await fetchText(url);
          if (status !== 200) {
            byUrl.set(url, {
              siteKey: site.key,
              url,
              slug: "",
              name: "",
              belgeNo: "",
              belgeNorm: "",
              entityId: "",
              fetchStatus: "error",
              error: `HTTP ${status}`,
            });
          } else {
            byUrl.set(url, parseCatalogEntry(site, url, text));
          }
        } catch (e) {
          byUrl.set(url, {
            siteKey: site.key,
            url,
            slug: "",
            name: "",
            belgeNo: "",
            belgeNorm: "",
            entityId: "",
            fetchStatus: "error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
        if ((idx + 1) % 25 === 0 || idx + 1 === pending.length) {
          const ok = [...byUrl.values()].filter(
            (e) => e.siteKey === site.key && e.fetchStatus === "ok"
          ).length;
          console.log(`   ${site.key}: ${idx + 1}/${pending.length} (ok=${ok})`);
          saveCatalog([...byUrl.values()]);
        }
        await sleep(options.delayMs);
      }
    }

    const workers = Array.from(
      { length: Math.max(1, options.concurrency) },
      () => worker()
    );
    await Promise.all(workers);
  }

  const entries = [...byUrl.values()];
  saveCatalog(entries);
  return entries;
}

function saveCatalog(entries: CatalogEntry[]) {
  const ok = entries.filter((e) => e.fetchStatus === "ok");
  writeFileSync(
    CACHE_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: entries.length,
        okCount: ok.length,
        entries,
      },
      null,
      2
    )
  );
}

function pickBestMatch(
  belgeNorm: string,
  catalog: CatalogEntry[]
): { match: CatalogEntry | null; ambiguous: CatalogEntry[]; note: string } {
  const hits = catalog
    .filter((e) => e.fetchStatus === "ok" && e.belgeNorm === belgeNorm)
    .sort((a, b) => {
      const pa = SITES.find((s) => s.key === a.siteKey)?.priority ?? 99;
      const pb = SITES.find((s) => s.key === b.siteKey)?.priority ?? 99;
      return pa - pb;
    });
  if (hits.length === 0) return { match: null, ambiguous: [], note: "eşleşme yok" };
  // Aynı site önceliğinde birden fazla URL varsa ambiguous
  const topPriority = SITES.find((s) => s.key === hits[0]!.siteKey)?.priority ?? 99;
  const topHits = hits.filter(
    (h) => (SITES.find((s) => s.key === h.siteKey)?.priority ?? 99) === topPriority
  );
  if (topHits.length > 1) {
    // Aynı entityId ise sorun yok
    const ids = new Set(topHits.map((h) => h.entityId));
    if (ids.size === 1) {
      return {
        match: topHits[0]!,
        ambiguous: [],
        note: `exact (${topHits[0]!.siteKey})`,
      };
    }
    return {
      match: null,
      ambiguous: topHits,
      note: `ambiguous: ${topHits.map((h) => h.url).join(" | ")}`,
    };
  }
  return {
    match: hits[0]!,
    ambiguous: [],
    note: `exact (${hits[0]!.siteKey})`,
  };
}

async function main() {
  const dryRun = argFlag("dry-run") || !argFlag("apply");
  const buildOnly = argFlag("build-only");
  const doSync = argFlag("sync");
  const resume = argFlag("resume");
  const delayMs = Number(argValue("delay-ms") || "250");
  const concurrency = Number(argValue("concurrency") || "3");
  const limit = Number(argValue("limit") || "0");
  const siteFilter = argValue("site");

  console.log({
    dryRun,
    buildOnly,
    doSync,
    resume,
    delayMs,
    concurrency,
    limit: limit || "all",
    siteFilter: siteFilter || "all",
  });

  let catalog: CatalogEntry[];
  if (resume && existsSync(CACHE_PATH) && !argFlag("rebuild")) {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as {
      entries?: CatalogEntry[];
    };
    catalog = parsed.entries || [];
    const ok = catalog.filter((e) => e.fetchStatus === "ok").length;
    console.log(`mevcut katalog: ${catalog.length} (ok=${ok}) — devam için --rebuild yok`);
    if (ok < 50 || argFlag("build")) {
      catalog = await buildCatalog({ resume: true, delayMs, concurrency, siteFilter });
    }
  } else {
    catalog = await buildCatalog({
      resume,
      delayMs,
      concurrency,
      siteFilter,
    });
  }

  const okCatalog = catalog.filter((e) => e.fetchStatus === "ok");
  console.log(`\nkatalog ok: ${okCatalog.length}`);
  if (buildOnly) {
    console.log("build-only — eşleştirme atlandı");
    return;
  }

  const villas = await prisma.villa.findMany({
    where: {
      externalSyncUrl1: { contains: "villavillam", mode: "insensitive" },
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      documentNo: true,
      externalSyncUrl1: true,
      _count: { select: { pricePeriods: true } },
    },
    orderBy: { villaId: "asc" },
  });
  console.log(`villavillam LINK1 villa: ${villas.length}`);

  const rows: MatchRow[] = [];
  let applied = 0;
  for (const villa of villas) {
    if (limit > 0 && applied >= limit && !dryRun) break;
    const belgeNorm = normalizeBelge(villa.documentNo);
    const { match, ambiguous, note } = belgeNorm
      ? pickBestMatch(belgeNorm, okCatalog)
      : { match: null, ambiguous: [], note: "belge boş" };

    const row: MatchRow = {
      villaDbId: villa.id,
      villaId: villa.villaId,
      name: villa.name,
      slug: villa.slug,
      documentNo: villa.documentNo,
      oldLink1: villa.externalSyncUrl1,
      newLink1: match?.url ?? null,
      matchSite: match?.siteKey ?? null,
      matchName: match?.name ?? null,
      matchEntityId: match?.entityId ?? null,
      matchConfidence: match
        ? "exact"
        : ambiguous.length
          ? "ambiguous"
          : "none",
      note,
    };

    if (match && !dryRun) {
      if (limit > 0 && applied >= limit) {
        rows.push(row);
        continue;
      }
      const saved = await setVillaExternalSyncUrl(villa.id, 1, match.url);
      if (!saved.ok) {
        row.note = `kaydetme hatası: ${saved.message}`;
      } else {
        applied += 1;
        row.note = `güncellendi → ${match.siteKey}`;
        if (doSync) {
          await sleep(400);
          const sync = await syncVillaExternalLinkSlot(villa.id, 1);
          row.syncOk = sync.ok;
          row.syncMessage = sync.message;
          const after = await prisma.villa.findUnique({
            where: { id: villa.id },
            select: { _count: { select: { pricePeriods: true } } },
          });
          row.periodsAfter = after?._count.pricePeriods ?? 0;
        }
      }
    }

    rows.push(row);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dryRun,
    doSync,
    catalogOk: okCatalog.length,
    villavillamCount: villas.length,
    exact: rows.filter((r) => r.matchConfidence === "exact").length,
    none: rows.filter((r) => r.matchConfidence === "none").length,
    ambiguous: rows.filter((r) => r.matchConfidence === "ambiguous").length,
    applied,
    syncOk: rows.filter((r) => r.syncOk).length,
    syncFail: rows.filter((r) => r.syncOk === false).length,
    bySite: Object.fromEntries(
      SITES.map((s) => [
        s.key,
        rows.filter((r) => r.matchSite === s.key).length,
      ])
    ),
    rows,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log("\n=== ÖZET ===");
  console.log({
    catalogOk: summary.catalogOk,
    villavillamCount: summary.villavillamCount,
    exact: summary.exact,
    none: summary.none,
    ambiguous: summary.ambiguous,
    applied: summary.applied,
    syncOk: summary.syncOk,
    syncFail: summary.syncFail,
    bySite: summary.bySite,
    report: REPORT_PATH,
    cache: CACHE_PATH,
  });

  const sample = rows.filter((r) => r.matchConfidence === "exact").slice(0, 8);
  for (const r of sample) {
    console.log(
      `✓ ${r.villaId} ${r.name} | ${r.documentNo} | ${r.matchSite} | ${r.newLink1}${
        r.syncMessage ? ` | ${r.syncMessage}` : ""
      }`
    );
  }
  const missing = rows.filter((r) => r.matchConfidence === "none").slice(0, 8);
  for (const r of missing) {
    console.log(`✗ ${r.villaId} ${r.name} | ${r.documentNo} | eşleşme yok`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
