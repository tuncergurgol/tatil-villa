/**
 * rezara.csv → telefon tekilleştir + isim sadeleştir + BONT müşteri/geçersiz telefon
 * filtrele → kalanları UYGUNLUK ARA kanalıyla Customer kaydet.
 *
 *   npx tsx scripts/import-rezara-uygunluk-ara.ts --dry-run
 *   npx tsx scripts/import-rezara-uygunluk-ara.ts --apply
 *   npx tsx scripts/import-rezara-uygunluk-ara.ts --apply --input=scripts/rezara-import.csv
 */
import { createReadStream, existsSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { prisma } from "../lib/db";
import { syncCustomerFromAvailabilitySearch } from "../lib/customer-crm";
import { CRM_CONTACT_CHANNEL_IDS } from "../lib/customer-crm-channels";
import { isValidTurkishMobileE164, normalizePhoneToE164 } from "../lib/phone";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "../lib/phone-utils";

type CleanRow = {
  fullName: string;
  phone: string;
  digits: string;
  firstContactAt: Date | null;
  sourceIds: string[];
  nameCandidates: string[];
};

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function scoreName(name: string): number {
  const n = name.trim();
  if (!n) return -100;
  const lower = n.toLocaleLowerCase("tr-TR");
  if (/^(t|s|ff|x|test|asd|qwe|null|undefined)$/i.test(n)) return -50;
  if (n.length <= 1) return -40;
  if (n.length === 2) return -10;
  let score = Math.min(n.length, 40);
  if (/\s/.test(n)) score += 8;
  if (/(bey|hanım|hanim|mr|mrs)/i.test(n)) score += 4;
  if (/[0-9]{4,}/.test(n)) score -= 15;
  if (/^[a-zA-ZçğıöşüÇĞİÖŞÜ. ]+$/.test(n)) score += 5;
  if (lower.includes("farketmez")) score -= 20;
  return score;
}

function pickBestName(names: string[]): string {
  const ranked = [...names]
    .map((n) => n.trim())
    .filter(Boolean)
    .sort((a, b) => scoreName(b) - scoreName(a) || b.length - a.length);
  return ranked[0]?.trim() || "Misafir";
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ";" && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

async function loadCleanRows(inputPath: string): Promise<{
  rows: CleanRow[];
  stats: Record<string, number>;
}> {
  const stats = {
    rawLines: 0,
    missingPhone: 0,
    invalidPhone: 0,
    uniquePhones: 0,
  };

  const byDigits = new Map<
    string,
    {
      names: string[];
      phone: string;
      firstContactAt: Date | null;
      sourceIds: string[];
    }
  >();

  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!header) {
      header = cols.map((c) => c.trim());
      continue;
    }
    stats.rawLines += 1;

    const get = (key: string) => {
      const idx = header!.findIndex(
        (h) => h.toLocaleLowerCase("tr-TR") === key.toLocaleLowerCase("tr-TR")
      );
      return idx >= 0 ? (cols[idx] ?? "").trim() : "";
    };

    // B=Ad, C=Telefon (CSV: RezAramaAdSoyad / RezAramaTelefon)
    const id = get("RezAramaID") || get("id");
    const name = get("RezAramaAdSoyad") || get("B") || cols[1] || "";
    const phoneRaw = get("RezAramaTelefon") || get("C") || cols[2] || "";
    const checkInRaw = get("RezAramaGirisTarihi") || "";

    const e164 =
      normalizePhoneToE164(phoneRaw) ||
      normalizeStoredTurkishPhone(phoneRaw) ||
      "";
    const digits = normalizeTurkishPhoneDigits(phoneRaw || e164);

    if (!digits) {
      stats.missingPhone += 1;
      continue;
    }
    if (!e164 || !isValidTurkishMobileE164(e164) || digits.length !== 10) {
      stats.invalidPhone += 1;
      continue;
    }

    const checkIn = checkInRaw ? new Date(checkInRaw) : null;
    const firstContactAt =
      checkIn && !Number.isNaN(checkIn.getTime()) ? checkIn : null;

    const existing = byDigits.get(digits);
    if (!existing) {
      byDigits.set(digits, {
        names: name ? [name] : [],
        phone: e164,
        firstContactAt,
        sourceIds: id ? [id] : [],
      });
    } else {
      if (name) existing.names.push(name);
      if (id) existing.sourceIds.push(id);
      if (
        firstContactAt &&
        (!existing.firstContactAt ||
          firstContactAt.getTime() < existing.firstContactAt.getTime())
      ) {
        existing.firstContactAt = firstContactAt;
      }
      // Daha temiz E.164 varsa güncelle
      if (e164.length >= existing.phone.length) existing.phone = e164;
    }
  }

  stats.uniquePhones = byDigits.size;
  const rows: CleanRow[] = [];
  for (const [digits, entry] of byDigits) {
    const fullName = pickBestName(entry.names);
    if (scoreName(fullName) < 0) {
      // İsim tamamen çöp ama telefon geçerli → yine de "Misafir" ile tut
      rows.push({
        fullName: "Misafir",
        phone: entry.phone,
        digits,
        firstContactAt: entry.firstContactAt,
        sourceIds: entry.sourceIds,
        nameCandidates: entry.names,
      });
      continue;
    }
    rows.push({
      fullName,
      phone: entry.phone,
      digits,
      firstContactAt: entry.firstContactAt,
      sourceIds: entry.sourceIds,
      nameCandidates: entry.names,
    });
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
  return { rows, stats };
}

async function main() {
  const apply = argFlag("apply");
  const dryRun = !apply;
  const input =
    argValue("input") ||
    (existsSync("scripts/rezara-import.csv")
      ? "scripts/rezara-import.csv"
      : "C:/Users/BARAN/Downloads/rezara.csv");

  if (!existsSync(input)) {
    throw new Error(`Dosya yok: ${input}`);
  }

  console.log({ input, dryRun, apply });
  const { rows, stats } = await loadCleanRows(input);
  console.log("parse_stats", stats);
  console.log("clean_unique_valid", rows.length);

  // Mevcut BONT müşterilerini telefon son 10 haneye göre yükle
  const existingCustomers = await prisma.customer.findMany({
    select: { id: true, phone: true, fullName: true },
  });
  const existingDigits = new Set<string>();
  for (const c of existingCustomers) {
    const d = normalizeTurkishPhoneDigits(c.phone);
    if (d.length === 10) existingDigits.add(d);
  }

  const toImport = rows.filter((r) => !existingDigits.has(r.digits));
  const skippedExisting = rows.length - toImport.length;

  console.log({
    existingCustomers: existingCustomers.length,
    skippedAlreadyInBont: skippedExisting,
    toImport: toImport.length,
  });

  const reportPath = "scripts/rezara-uygunluk-ara-report.json";
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun,
        parse_stats: stats,
        clean_unique_valid: rows.length,
        skippedAlreadyInBont: skippedExisting,
        toImport: toImport.length,
        sample: toImport.slice(0, 20),
      },
      null,
      2
    )
  );
  console.log("report", reportPath);

  if (dryRun) {
    console.log("dry-run — kayıt yok");
    return;
  }

  const channel = await prisma.customerContactChannel.findUnique({
    where: { id: CRM_CONTACT_CHANNEL_IDS.UYGUNLUK_ARA },
    select: { id: true, name: true },
  });
  if (!channel) {
    throw new Error(
      `UYGUNLUK ARA kanalı yok: ${CRM_CONTACT_CHANNEL_IDS.UYGUNLUK_ARA}`
    );
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const batchSize = 100;
  for (let i = 0; i < toImport.length; i += batchSize) {
    const batch = toImport.slice(i, i + batchSize);
    for (const row of batch) {
      try {
        const result = await syncCustomerFromAvailabilitySearch({
          guestName: row.fullName,
          phone: row.phone,
          contactChannelId: CRM_CONTACT_CHANNEL_IDS.UYGUNLUK_ARA,
          firstContactAt: row.firstContactAt ?? undefined,
        });
        if (!result) {
          failed += 1;
          continue;
        }
        if (result.created) created += 1;
        else updated += 1;
      } catch (e) {
        failed += 1;
        console.error(
          "fail",
          row.phone,
          e instanceof Error ? e.message : e
        );
      }
    }
    console.log(
      `progress ${Math.min(i + batchSize, toImport.length)}/${toImport.length} created=${created} updated=${updated} failed=${failed}`
    );
  }

  console.log({ created, updated, failed, channel: channel.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
