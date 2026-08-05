import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildMetaCatalogFeedXml } from "@/lib/meta-catalog-feed";
import type { PublicSiteProfile } from "@/lib/public-site-profile";

const CACHE_TTL_MS = 60 * 60 * 1000;

type MemoryEntry = {
  xml: string;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryEntry>();

function cacheDir(): string {
  return path.join(process.cwd(), "data", "meta-catalog-feed");
}

function cacheFile(siteKey: string): string {
  return path.join(cacheDir(), `${siteKey}.xml`);
}

async function readDiskCache(siteKey: string): Promise<string | null> {
  try {
    const file = cacheFile(siteKey);
    const fileStat = await stat(file);
    if (Date.now() - fileStat.mtimeMs > CACHE_TTL_MS) return null;
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function writeDiskCache(siteKey: string, xml: string): Promise<void> {
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  await writeFile(cacheFile(siteKey), xml, "utf8");
}

function remember(siteKey: string, xml: string): string {
  memoryCache.set(siteKey, {
    xml,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return xml;
}

export async function getMetaCatalogFeedXml(
  site: PublicSiteProfile
): Promise<string> {
  const now = Date.now();
  const cached = memoryCache.get(site.key);
  if (cached && cached.expiresAt > now) {
    return cached.xml;
  }

  const disk = await readDiskCache(site.key);
  if (disk) {
    return remember(site.key, disk);
  }

  const xml = await buildMetaCatalogFeedXml(site);
  remember(site.key, xml);
  await writeDiskCache(site.key, xml).catch((error) => {
    console.warn("[meta-catalog-feed-cache] disk write failed", error);
  });
  return xml;
}

export async function warmMetaCatalogFeedCache(
  site: PublicSiteProfile
): Promise<{ siteKey: string; bytes: number; itemHint: number }> {
  const xml = await buildMetaCatalogFeedXml(site);
  remember(site.key, xml);
  await writeDiskCache(site.key, xml);
  const itemHint = (xml.match(/<item>/g) ?? []).length;
  return {
    siteKey: site.key,
    bytes: Buffer.byteLength(xml, "utf8"),
    itemHint,
  };
}
