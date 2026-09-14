/**
 * Eski CRM'den (crm.tatildeyiz.com.tr) dışa aktarılan "Villa Sahipleri"
 * verisindeki IBAN / TC Kimlik No / Vergi No / Vergi Dairesi / Muhasebe Kodu
 * alanlarını, bu sistemdeki VillaOwner kayıtlarına villa eşleştirmesi
 * üzerinden (CRM properties[].id == Villa.villaId) aktarır.
 *
 * Sadece şu anda BOŞ olan alanları doldurur — mevcut, elle girilmiş bir
 * değerin üzerine YAZMAZ (varsa "conflict" olarak sayılır ve dokunulmaz).
 *
 * Varsayılan olarak DRY RUN çalışır (hiçbir şey yazmaz, sadece rapor
 * verir). Gerçek güncelleme için: npx tsx scripts/import-crm-villa-owner-financials.ts --apply
 *
 * Girdi dosyası: CRM'deki /v1/admin/listHosts yanıtının ham JSON'u
 * (varsayılan yol: C:\Users\BARAN\Downloads\crm-villa-sahipleri-export1.json)
 */
import fs from "node:fs";
import { prisma } from "../lib/db";
import { normalizeTurkishPhoneDigits } from "../lib/phone-utils";

const DEFAULT_FILE_PATH =
  "C:\\Users\\BARAN\\Downloads\\crm-villa-sahipleri-export1.json";

type CrmHostRecord = {
  id: number;
  iban: string | null;
  iban2: string | null;
  bankaHesapSahibiAdi: string | null;
  muhasebeKodu: string | null;
  fullname: string | null;
  user: {
    identityNumber: string | null;
    taxNumber: string | null;
    taxOffice: string | null;
    accountingCode: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  properties: { id: number; title: string }[];
};

function loadHosts(filePath: string): CrmHostRecord[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  const content = data?.content ?? data;
  const list = Array.isArray(content) ? content : [];
  return list as CrmHostRecord[];
}

function cleanString(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeIban(value: string | null | undefined): string {
  return cleanString(value).replace(/\s+/g, "").toUpperCase();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const filePathArg = process.argv.find((arg) => arg.startsWith("--file="));
  const filePath = filePathArg ? filePathArg.slice("--file=".length) : DEFAULT_FILE_PATH;

  const hosts = loadHosts(filePath);
  console.log(`CRM host kaydı okundu: ${hosts.length}`);

  const villas = await prisma.villa.findMany({
    where: { villaId: { not: null } },
    select: { id: true, villaId: true, ownerId: true, name: true },
  });
  const villaIdToOwnerId = new Map<number, string>();
  for (const villa of villas) {
    if (villa.villaId != null && villa.ownerId) {
      villaIdToOwnerId.set(villa.villaId, villa.ownerId);
    }
  }
  console.log(`Yerel villa (villaId dolu) sayısı: ${villas.length}`);

  let hostsWithNoPropertyMatch = 0;
  let hostsMatched = 0;
  const ownerIdsToUpdate = new Map<string, CrmHostRecord>();

  for (const host of hosts) {
    const properties = Array.isArray(host.properties) ? host.properties : [];
    let matchedOwnerId: string | null = null;
    for (const property of properties) {
      const ownerId = villaIdToOwnerId.get(property.id);
      if (ownerId) {
        matchedOwnerId = ownerId;
        break;
      }
    }
    if (!matchedOwnerId) {
      hostsWithNoPropertyMatch += 1;
      continue;
    }
    hostsMatched += 1;
    // Aynı owner birden çok CRM host'una eşleşirse ilk eşleşen kazanır (nadir/veri tutarsızlığı).
    if (!ownerIdsToUpdate.has(matchedOwnerId)) {
      ownerIdsToUpdate.set(matchedOwnerId, host);
    }
  }

  console.log(`Eşleşen (en az bir villası bulunan) CRM host: ${hostsMatched}`);
  console.log(`Eşleşmeyen CRM host (villaId eşleşmedi): ${hostsWithNoPropertyMatch}`);
  console.log(`Güncellenecek benzersiz VillaOwner sayısı: ${ownerIdsToUpdate.size}`);

  const fieldFillCounts = {
    tcKimlikNo: 0,
    taxNumber: 0,
    taxOffice: 0,
    bankIban: 0,
    bankAccountHolder: 0,
    accountingCode: 0,
    phone: 0,
    email: 0,
  };
  const fieldConflictCounts = { ...fieldFillCounts };
  let ownersActuallyUpdated = 0;

  for (const [ownerId, host] of ownerIdsToUpdate) {
    const owner = await prisma.villaOwner.findUnique({ where: { id: ownerId } });
    if (!owner) continue;

    const candidates: Record<string, string> = {
      tcKimlikNo: cleanString(host.user?.identityNumber),
      taxNumber: cleanString(host.user?.taxNumber),
      taxOffice: cleanString(host.user?.taxOffice),
      bankIban: normalizeIban(host.iban),
      bankAccountHolder: cleanString(host.bankaHesapSahibiAdi),
      accountingCode: cleanString(host.muhasebeKodu || host.user?.accountingCode),
      phone: cleanString(host.user?.phone),
      email: cleanString(host.user?.email),
    };

    const update: Record<string, string> = {};
    for (const [field, candidateValue] of Object.entries(candidates)) {
      if (!candidateValue) continue;
      const currentValue = cleanString((owner as Record<string, unknown>)[field] as string);
      if (!currentValue) {
        update[field] = candidateValue;
        fieldFillCounts[field as keyof typeof fieldFillCounts] += 1;
        continue;
      }
      const isSame =
        field === "phone"
          ? normalizeTurkishPhoneDigits(currentValue) === normalizeTurkishPhoneDigits(candidateValue)
          : currentValue === candidateValue;
      if (!isSame) {
        fieldConflictCounts[field as keyof typeof fieldConflictCounts] += 1;
      }
    }

    if (Object.keys(update).length === 0) continue;

    ownersActuallyUpdated += 1;
    if (apply) {
      await prisma.villaOwner.update({ where: { id: ownerId }, data: update });
    }
  }

  console.log(`\n${apply ? "UYGULANDI" : "DRY RUN (hiçbir şey yazılmadı)"}`);
  console.log(`Güncellenecek/güncellenen owner sayısı: ${ownersActuallyUpdated}`);
  console.log("Doldurulan alan sayıları:", fieldFillCounts);
  console.log(
    "Çakışan (mevcut farklı bir değer olduğu için DOKUNULMADI) alan sayıları:",
    fieldConflictCounts
  );

  if (!apply) {
    console.log(
      "\nGerçek güncellemeyi uygulamak için: npx tsx scripts/import-crm-villa-owner-financials.ts --apply"
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
