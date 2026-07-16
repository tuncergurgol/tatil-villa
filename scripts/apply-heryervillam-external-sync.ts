/**
 * Excel eşleştirme sheet'inden heryervillam URL'lerini
 * Villa externalSyncUrl slotlarına yazar ve hemen sync eder.
 *
 *   npx tsx scripts/apply-heryervillam-external-sync.ts
 *   npx tsx scripts/apply-heryervillam-external-sync.ts --xlsx=C:/path/to.xlsx
 *   npx tsx scripts/apply-heryervillam-external-sync.ts --dry-run
 *   npx tsx scripts/apply-heryervillam-external-sync.ts --delay-ms=800
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
  type ExternalSyncSlot,
} from "../lib/villa-external-sync";

const DEFAULT_XLSX = join(
  process.env.USERPROFILE || join(homedir()),
  "OneDrive",
  "Desktop",
  "heryervillam-eslestirme.xlsx"
);

type SheetRow = {
  ourVillaId?: string;
  ourNumericVillaId?: number | string;
  belgeNo?: string;
  ourSlug?: string;
  externalUrl?: string;
  matchConfidence?: string;
  matchNote?: string;
  ourName?: string;
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
      n.trim().toLowerCase() === "eşleştirme (1)"
  );
  if (preferred) return preferred;

  const similar = names.find((n) =>
    /eslestirme|eşleştirme/i.test(n)
  );
  if (similar) return similar;

  throw new Error(`Uygun sheet yok. Mevcut: ${names.join(", ")}`);
}

function firstEmptySlot(villa: {
  externalSyncUrl1: string;
  externalSyncUrl2: string;
  externalSyncUrl3: string;
  externalSyncUrl4: string;
}): ExternalSyncSlot | null {
  const urls = [
    villa.externalSyncUrl1,
    villa.externalSyncUrl2,
    villa.externalSyncUrl3,
    villa.externalSyncUrl4,
  ];
  for (let i = 0; i < 4; i++) {
    if (!(urls[i] ?? "").trim()) return (i + 1) as ExternalSyncSlot;
  }
  return null;
}

function findSlotWithUrl(
  villa: {
    externalSyncUrl1: string;
    externalSyncUrl2: string;
    externalSyncUrl3: string;
    externalSyncUrl4: string;
  },
  url: string
): ExternalSyncSlot | null {
  const normalized = url.trim().replace(/\/+$/, "").toLowerCase();
  const urls = [
    villa.externalSyncUrl1,
    villa.externalSyncUrl2,
    villa.externalSyncUrl3,
    villa.externalSyncUrl4,
  ];
  for (let i = 0; i < 4; i++) {
    const existing = (urls[i] ?? "").trim().replace(/\/+$/, "").toLowerCase();
    if (existing && existing === normalized) {
      return (i + 1) as ExternalSyncSlot;
    }
  }
  return null;
}

async function resolveVilla(row: SheetRow) {
  const cuid = String(row.ourVillaId ?? "").trim();
  if (cuid) {
    const byId = await prisma.villa.findUnique({
      where: { id: cuid },
      select: {
        id: true,
        name: true,
        slug: true,
        villaId: true,
        documentNo: true,
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncUrl4: true,
      },
    });
    if (byId) return byId;
  }

  const numeric = Number(row.ourNumericVillaId);
  if (Number.isFinite(numeric) && numeric > 0) {
    const byNum = await prisma.villa.findFirst({
      where: { villaId: numeric },
      select: {
        id: true,
        name: true,
        slug: true,
        villaId: true,
        documentNo: true,
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncUrl4: true,
      },
    });
    if (byNum) return byNum;
  }

  const belge = String(row.belgeNo ?? "").trim();
  if (belge) {
    const byBelge = await prisma.villa.findFirst({
      where: { documentNo: belge },
      select: {
        id: true,
        name: true,
        slug: true,
        villaId: true,
        documentNo: true,
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncUrl4: true,
      },
    });
    if (byBelge) return byBelge;
  }

  const slug = String(row.ourSlug ?? "").trim();
  if (slug) {
    const bySlug = await prisma.villa.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        villaId: true,
        documentNo: true,
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncUrl4: true,
      },
    });
    if (bySlug) return bySlug;
  }

  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const delayMs = Math.max(0, Number(argValue("delay-ms") ?? "800") || 800);
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
      : XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
          header: 1,
          defval: "",
        })[0];

  console.log(`Excel: ${xlsxPath}`);
  console.log(`Sheet: "${sheetName}" (mevcut: ${wb.SheetNames.join(" | ")})`);
  console.log(`Kolonlar: ${JSON.stringify(columns)}`);
  console.log(`Satır: ${raw.length}, dryRun=${dryRun}, delayMs=${delayMs}`);

  const toProcess = raw.filter((row) => {
    const url = String(row.externalUrl ?? "").trim();
    const conf = String(row.matchConfidence ?? "").trim().toLowerCase();
    if (!url) return false;
    if (conf === "none") return false;
    return true;
  });

  const skippedNoMatch = raw.length - toProcess.length;
  console.log(
    `Eşleşen satır (URL dolu, confidence≠none): ${toProcess.length}; skip: ${skippedNoMatch}`
  );

  let saved = 0;
  let alreadyHad = 0;
  let syncOk = 0;
  let syncFail = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i]!;
    const url = String(row.externalUrl ?? "").trim();
    const label = `${row.ourName || row.ourSlug || row.ourVillaId} (#${row.ourNumericVillaId ?? "?"})`;
    const progress = `[${i + 1}/${toProcess.length}]`;

    const villa = await resolveVilla(row);
    if (!villa) {
      skipped++;
      const msg = `${progress} SKIP villa bulunamadı: ${label}`;
      console.log(msg);
      errors.push(msg);
      continue;
    }

    const existingSlot = findSlotWithUrl(villa, url);
    let slot: ExternalSyncSlot | null = existingSlot;
    let didSave = false;

    if (existingSlot) {
      alreadyHad++;
      console.log(
        `${progress} Zaten slot ${existingSlot}: ${villa.name} → ${url}`
      );
    } else {
      slot = firstEmptySlot(villa);
      if (!slot) {
        skipped++;
        const msg = `${progress} SKIP slot dolu (1–4): ${villa.name}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      if (dryRun) {
        console.log(
          `${progress} DRY kaydedilecek slot ${slot}: ${villa.name} → ${url}`
        );
        saved++;
        continue;
      }

      const setResult = await setVillaExternalSyncUrl(villa.id, slot, url);
      if (!setResult.ok) {
        syncFail++;
        const msg = `${progress} ERR kaydet: ${villa.name}: ${setResult.message}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }
      saved++;
      didSave = true;
      console.log(
        `${progress} KAYDEDİLDİ slot ${slot}: ${villa.name} → ${url}`
      );
    }

    if (dryRun || !slot) continue;

    const syncResult = await syncVillaExternalLinkSlot(villa.id, slot);
    if (syncResult.ok) {
      syncOk++;
      console.log(
        `${progress} SYNC OK slot ${slot}: ${syncResult.message}`
      );
    } else {
      syncFail++;
      const msg = `${progress} SYNC ERR slot ${slot}: ${syncResult.message}`;
      console.log(msg);
      errors.push(msg);
    }

    // heryervillam scrape için ekstra nazik bekleme
    if (i < toProcess.length - 1) {
      await sleep(delayMs);
    }

    void didSave;
  }

  console.log("\n========== ÖZET ==========");
  console.log(`Sheet: ${sheetName}`);
  console.log(`İşlenen eşleşme: ${toProcess.length}`);
  console.log(`Yeni kaydedilen link: ${saved}`);
  console.log(`Zaten kayıtlı (aynı URL): ${alreadyHad}`);
  console.log(`Sync başarılı: ${syncOk}`);
  console.log(`Sync/ kayıt hata: ${syncFail}`);
  console.log(`Skip: ${skipped} (+ confidence/ boş: ${skippedNoMatch})`);
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
