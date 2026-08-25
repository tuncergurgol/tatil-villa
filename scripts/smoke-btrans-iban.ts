/**
 * BTRANS / Türkiye IBAN doğrulama smoke.
 * Çalıştır: npx tsx scripts/smoke-btrans-iban.ts
 */
import { checkMissingFields, normalizeIbanForBtrans } from "../lib/btrans-report";
import {
  hasValidIbanChecksum,
  isValidTurkishIban,
  turkishIbanIssue,
} from "../lib/iban";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

function main() {
  const gib25 = "TR58001200167300010100127";
  const repaired = "TR580001200167300010100127";
  const spacedCompany = "TR92 0020 5000 0966 7140 1000 01";

  assert(normalizeIbanForBtrans(gib25).length === 25, "GİB örneği 25 hane");
  assert(
    turkishIbanIssue(gib25) === "IBAN 25 hane (GİB 26 hane ister)",
    "25 hane hata mesajı"
  );
  assert(!isValidTurkishIban(gib25), "25 hane geçersiz");
  assert(isValidTurkishIban(repaired), "Halkbank 00012 onarımı geçerli");
  assert(hasValidIbanChecksum(repaired), "onarım checksum");
  assert(isValidTurkishIban(spacedCompany), "boşluklu şirket IBAN");
  assert(turkishIbanIssue("TR") === "IBAN 2 hane (GİB 26 hane ister)", "yalnız TR");
  assert(turkishIbanIssue("") === "IBAN (26 hane)", "boş IBAN");

  const owner = {
    type: "TUZEL_KISI" as const,
    name: "Test",
    firstName: "",
    lastName: "",
    companyTitle: "Test Ltd",
    tcKimlikNo: "",
    taxNumber: "6231137867",
    bankIban: gib25,
    phone: "5321112233",
    email: "test@example.com",
  };
  const region = {
    ilAdi: "Antalya",
    ilKodu: "07",
    ilceAdi: "Kaş",
    ilceKodu: "1234",
    mahalleAdi: "Merkez",
  };
  const missing = checkMissingFields(owner, region);
  assert(
    missing.some((item) => item.includes("25 hane")),
    "BTRANS eksik listesine 25 hane IBAN düşer"
  );
  assert(
    checkMissingFields({ ...owner, bankIban: repaired }, region).length === 0,
    "geçerli IBAN ile eksik yok"
  );

  console.log("smoke ok — btrans iban");
}

main();
