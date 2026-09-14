/**
 * Excel eşleştirme sheet'inden kiralikvilladatatil URL'lerini
 * Villa.externalSyncUrl1'e yazar (yalnızca slot 1 boşsa) ve hemen sync eder.
 *
 *   npx tsx scripts/apply-kiralikvilladatatil-external-sync.ts
 *   npx tsx scripts/apply-kiralikvilladatatil-external-sync.ts --xlsx=C:/path/to.xlsx
 *   npx tsx scripts/apply-kiralikvilladatatil-external-sync.ts --dry-run
 *   npx tsx scripts/apply-kiralikvilladatatil-external-sync.ts --delay-ms=800
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
  "kiralikvilladatatil-eslestirme.xlsx"
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
  if (names.length === 0) {
    throw new Error("Excel'de sheet yok");
  }

  const preferred = names.find((n) =>
    /eslestirme|eşleştirme/i.test(n.trim())
  );
  if (preferred) return preferred;

  return names[0]!;
}

/** Tek URL; ambiguous pipe-list veya boş → null */
function pickSingleUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("|")) return null;
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/i.test(u.protocol)) return null;
    if (!u.hostname.toLowerCase().includes("kiralikvilladatatil")) return null;
    return trimmed;
  } catch {
    return null;
  }
}

async function resolveVilla(row: SheetRow) {
  const select = {
    id: true,
    name: true,
    slug: true,
    villaId: true,
    documentNo: true,
    externalSyncUrl1: true,
    externalSyncUrl2: true,
    externalSyncUrl3: true,
    externalSyncUrl4: true,
  } as const;

  const cuid = String(row.ourVillaId ?? "").trim();
  if (cuid) {
    const byId = await prisma.villa.findUnique({
      where: { id: cuid },
      select,
    });
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
    const bySlug = await prisma.villa.findFirst({
      where: { slug },
      select,
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
  console.log(
    "Kural: yalnızca exact/fuzzy + dolu tek URL; Link1 doluysa atla; slot=1"
  );

  const toProcess = raw.filter((row) => {
    const conf = String(row.matchConfidence ?? "").trim().toLowerCase();
    if (conf !== "exact" && conf !== "fuzzy") return false;
    const url = pickSingleUrl(String(row.externalUrl ?? ""));
    return Boolean(url);
  });

  const skippedNoMatch = raw.length - toProcess.length;
  console.log(
    `Eşleşen satır (exact/fuzzy + tek URL): ${toProcess.length}; Excel skip: ${skippedNoMatch}`
  );

  let saved = 0;
  let link1AlreadyFilled = 0;
  let syncOk = 0;
  let syncFail = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i]!;
    const url = pickSingleUrl(String(row.externalUrl ?? ""))!;
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

    const existing1 = (villa.externalSyncUrl1 ?? "").trim();
    const existingNorm = existing1.replace(/\/+$/, "").toLowerCase();
    const urlNorm = url.replace(/\/+$/, "").toLowerCase();
    const sameUrlAlready = Boolean(existing1) && existingNorm === urlNorm;

    if (existing1 && !sameUrlAlready) {
      link1AlreadyFilled++;
      console.log(
        `${progress} SKIP Link1 dolu (farklı URL): ${villa.name} → ${existing1}`
      );
      continue;
    }

    if (dryRun) {
      if (sameUrlAlready) {
        console.log(
          `${progress} DRY sync tekrar (Link1 aynı): ${villa.name} → ${url}`
        );
      } else {
        saved++;
        console.log(
          `${progress} DRY kaydedilecek slot 1: ${villa.name} → ${url}`
        );
      }
      continue;
    }

    if (!sameUrlAlready) {
      const setResult = await setVillaExternalSyncUrl(villa.id, 1, url);
      if (!setResult.ok) {
        syncFail++;
        const msg = `${progress} ERR kaydet: ${villa.name}: ${setResult.message}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }
      saved++;
      console.log(`${progress} KAYDEDİLDİ slot 1: ${villa.name} → ${url}`);
    } else {
      console.log(
        `${progress} Link1 aynı URL, force sync: ${villa.name} → ${url}`
      );
    }

    const syncResult = await syncVillaExternalLinkSlot(villa.id, 1);
    if (syncResult.ok) {
      syncOk++;
      console.log(
        `${progress} SYNC OK slot 1: ${syncResult.message}`
      );
    } else {
      syncFail++;
      const msg = `${progress} SYNC ERR slot 1: ${syncResult.message}`;
      console.log(msg);
      errors.push(msg);
    }

    if (i < toProcess.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log("\n========== ÖZET ==========");
  console.log(`Sheet: ${sheetName}`);
  console.log(`İşlenen eşleşme (exact/fuzzy): ${toProcess.length}`);
  console.log(`Yeni kaydedilen Link1: ${saved}`);
  console.log(`Link1 zaten dolu (atlandı): ${link1AlreadyFilled}`);
  console.log(`Sync başarılı: ${syncOk}`);
  console.log(`Sync/kayıt hata: ${syncFail}`);
  console.log(
    `Skip (villa yok vb.): ${skipped} (+ Excel none/ambiguous/boş: ${skippedNoMatch})`
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
