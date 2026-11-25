/**
 * Excel eşleştirme sheet'inden villakalkan.com.tr URL'lerini
 * Villa.externalSyncUrl1 (Link 1) alanına yazar ve hemen sync eder.
 *
 * Sadece Link 1 boş villalar işlenir. exact/fuzzy + tek URL satırlar.
 *
 *   npx tsx scripts/apply-villakalkan-external-sync.ts
 *   npx tsx scripts/apply-villakalkan-external-sync.ts --xlsx=C:/path/to.xlsx
 *   npx tsx scripts/apply-villakalkan-external-sync.ts --dry-run
 *   npx tsx scripts/apply-villakalkan-external-sync.ts --delay-ms=800
 *   npx tsx scripts/apply-villakalkan-external-sync.ts --limit=10
 */
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const DEFAULT_XLSX = join(
  process.env.USERPROFILE || join(homedir()),
  "OneDrive",
  "Desktop",
  "villakalkan-eslestirme.xlsx"
);

type SheetRow = {
  ourVillaId?: string;
  ourNumericVillaId?: number | string;
  belgeNo?: string;
  ourSlug?: string;
  ourName?: string;
  villakalkanUrl?: string;
  externalUrl?: string;
  matchConfidence?: string;
  matchNote?: string;
};

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function pickSheetName(names: string[]): string {
  const preferred = names.find(
    (n) =>
      n.trim().toLowerCase() === "eslestirme (1)" ||
      n.trim().toLowerCase() === "eşleştirme (1)" ||
      n.trim().toLowerCase() === "eslestirme"
  );
  if (preferred) return preferred;

  const similar = names.find((n) => /eslestirme|eşleştirme/i.test(n));
  if (similar) return similar;

  if (names.includes("Sheet1")) return "Sheet1";
  if (names[0]) return names[0];

  throw new Error(`Uygun sheet yok. Mevcut: ${names.join(", ")}`);
}

/** Tek villakalkan URL; ambiguous pipe-list veya boş → null */
function pickSingleUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("|")) return null;
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/i.test(u.protocol)) return null;
    if (!u.hostname.toLowerCase().includes("villakalkan")) return null;
    return trimmed.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function rowUrl(row: SheetRow): string | null {
  return pickSingleUrl(
    String(row.villakalkanUrl || row.externalUrl || "")
  );
}

async function resolveVilla(row: SheetRow) {
  const select = {
    id: true,
    name: true,
    slug: true,
    villaId: true,
    documentNo: true,
    externalSyncUrl1: true,
  } as const;

  const cuid = String(row.ourVillaId ?? "").trim();
  if (cuid) {
    const byId = await prisma.villa.findUnique({ where: { id: cuid }, select });
    if (byId) return byId;
  }

  const numeric = Number(row.ourNumericVillaId);
  if (Number.isFinite(numeric) && numeric > 0) {
    const byNum = await prisma.villa.findFirst({
      where: { villaId: numeric },
      select,
    });
    if (byNum) return byNum;
  }

  const belge = String(row.belgeNo ?? "").trim();
  if (belge) {
    const byBelge = await prisma.villa.findFirst({
      where: { documentNo: belge },
      select,
    });
    if (byBelge) return byBelge;
  }

  const slug = String(row.ourSlug ?? "").trim();
  if (slug) {
    const bySlug = await prisma.villa.findFirst({ where: { slug }, select });
    if (bySlug) return bySlug;
  }

  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const delayParsed = Number(argValue("delay-ms") ?? "800");
  const delayMs = Number.isFinite(delayParsed) ? Math.max(0, delayParsed) : 800;
  const limitRaw = argValue("limit");
  const limit =
    limitRaw != null && Number.isFinite(Number(limitRaw))
      ? Math.max(0, Number(limitRaw))
      : undefined;
  const xlsxPath = argValue("xlsx") ?? DEFAULT_XLSX;

  if (!existsSync(xlsxPath)) {
    throw new Error(`Excel bulunamadı: ${xlsxPath}`);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheetName = pickSheetName(wb.SheetNames);
  const raw = XLSX.utils.sheet_to_json<SheetRow>(wb.Sheets[sheetName], {
    defval: "",
  });

  const columns =
    raw.length > 0
      ? Object.keys(raw[0] as object)
      : (
          XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
            header: 1,
            defval: "",
          })[0] as string[]
        );

  console.log(`Excel: ${xlsxPath}`);
  console.log(`Sheet: "${sheetName}" (mevcut: ${wb.SheetNames.join(" | ")})`);
  console.log(`Kolonlar: ${JSON.stringify(columns)}`);
  console.log(
    `Satır: ${raw.length}, dryRun=${dryRun}, delayMs=${delayMs}, limit=${limit ?? "all"}`
  );
  console.log(
    "Kural: yalnızca exact/fuzzy + tek villakalkan URL; Link1 doluysa atla; slot=1"
  );

  const toProcess = raw.filter((row) => {
    const conf = String(row.matchConfidence ?? "").trim().toLowerCase();
    if (conf !== "exact" && conf !== "fuzzy") return false;
    return Boolean(rowUrl(row));
  });

  const skippedNoMatch = raw.length - toProcess.length;
  console.log(
    `Eşleşen satır (exact/fuzzy + tek URL): ${toProcess.length}; Excel skip: ${skippedNoMatch}`
  );

  const work = limit != null ? toProcess.slice(0, limit) : toProcess;

  let saved = 0;
  let skippedLink1Filled = 0;
  let syncOk = 0;
  let syncFail = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < work.length; i++) {
    const row = work[i]!;
    const url = rowUrl(row)!;
    const label = `${row.ourName || row.ourSlug || row.ourVillaId} (#${row.ourNumericVillaId ?? "?"})`;
    const progress = `[${i + 1}/${work.length}]`;

    const villa = await resolveVilla(row);
    if (!villa) {
      skipped++;
      const msg = `${progress} SKIP villa bulunamadı: ${label}`;
      console.log(msg);
      errors.push(msg);
      continue;
    }

    if ((villa.externalSyncUrl1 ?? "").trim()) {
      skippedLink1Filled++;
      console.log(
        `${progress} SKIP Link1 dolu: ${villa.name} → ${villa.externalSyncUrl1}`
      );
      continue;
    }

    if (dryRun) {
      console.log(
        `${progress} DRY kaydedilecek Link1: ${villa.name} → ${url}`
      );
      saved++;
      continue;
    }

    const setResult = await setVillaExternalSyncUrl(villa.id, 1, url);
    if (!setResult.ok) {
      syncFail++;
      const msg = `${progress} ERR kaydet: ${villa.name}: ${setResult.message}`;
      console.log(msg);
      errors.push(msg);
      continue;
    }
    saved++;
    console.log(`${progress} KAYDEDİLDİ Link1: ${villa.name} → ${url}`);

    const syncResult = await syncVillaExternalLinkSlot(villa.id, 1);
    if (syncResult.ok) {
      syncOk++;
      console.log(`${progress} SYNC OK Link1: ${syncResult.message}`);
    } else {
      syncFail++;
      const msg = `${progress} SYNC ERR Link1: ${syncResult.message}`;
      console.log(msg);
      errors.push(msg);
    }

    if (i < work.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log("\n========== ÖZET ==========");
  console.log(`Sheet: ${sheetName}`);
  console.log(`Excel eşleşme (exact/fuzzy+tek URL): ${toProcess.length}`);
  console.log(`İşlenen (limit sonrası): ${work.length}`);
  console.log(`Yeni kaydedilen Link1: ${saved}`);
  console.log(`Skip Link1 zaten dolu: ${skippedLink1Filled}`);
  console.log(`Sync başarılı: ${syncOk}`);
  console.log(`Sync/kayıt hata: ${syncFail}`);
  console.log(
    `Skip diğer: ${skipped} (+ confidence/ambiguous/boş: ${skippedNoMatch})`
  );
  if (errors.length) {
    console.log(`\nHatalar (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
