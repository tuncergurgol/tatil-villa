import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

/**
 * Bu dosya client component'lerden de import edildiği için (BtransReportPage.tsx)
 * kasıtlı olarak Prisma/DB'ye dokunan hiçbir modülü import etmez — aksi halde
 * "PrismaClient is unable to run in this browser environment" hatası oluşur.
 * DB'ye bağlı yardımcılar (örn. resolveApprovedAt) lib/queries/btrans-report.ts'te yer alır.
 *
 * GİB BTRANS — 538 Sıra No.lu VUK Genel Tebliği kapsamında
 * "günübirlik konut kiralama" aylık bildirim XML'i.
 *
 * Bu modül, tatildeyiz.com.tr'nin eski CRM'sindeki
 * (crm.tatildeyiz.com.tr/sistem/btrans) üretim davranışının aynısını
 * hedefler: seçilen ay + tarih bazına göre ONAYLI rezervasyonlar
 * "gunubirlikson.xsd" şemasına uygun bir XML'e toplanır; zorunlu alanı
 * (IBAN, ev sahibi TC/VKN, cep, il/ilçe kodu) eksik olan kayıtlar
 * dosyaya alınmaz ve ayrıca "eksik" listesinde bildirilir.
 *
 * Tapu (zemin sistem no / yevmiye no) ve cadde/sokak/kapı no alanları
 * sistemde tutulmadığından kılavuza uygun şekilde sabit "0" gönderilir.
 */

export type BtransDateBasis = "approvedAt" | "createdAt" | "checkIn";

export const BTRANS_DATE_BASIS_OPTIONS: {
  value: BtransDateBasis;
  label: string;
}[] = [
  { value: "approvedAt", label: "Onay Tarihi (varsayılan)" },
  { value: "createdAt", label: "Oluşturma Tarihi" },
  { value: "checkIn", label: "Giriş Tarihi" },
];

export type BtransOwnerInput = {
  type: "GERCEK_KISI" | "TUZEL_KISI";
  name: string;
  firstName: string;
  lastName: string;
  companyTitle: string;
  tcKimlikNo: string;
  taxNumber: string;
  bankIban: string;
  phone: string;
  email: string;
} | null;

export type BtransRegionCodes = {
  ilAdi: string;
  ilKodu: string | null;
  ilceAdi: string;
  ilceKodu: string | null;
  mahalleAdi: string;
};

export type BtransBookingInput = {
  bookingId: string;
  externalCode: string;
  checkIn: Date;
  checkOut: Date;
  createdAt: Date;
  details: unknown;
  villa: {
    name: string;
    villaId: number | null;
    slug: string;
    latitude: number;
    longitude: number;
  };
  owner: BtransOwnerInput;
  region: BtransRegionCodes;
};

export type BtransIncompleteRow = {
  bookingId: string;
  externalCode: string;
  villaName: string;
  il: string;
  ilce: string;
  ownerName: string;
  checkIn: string;
  missing: string[];
};

export type BtransIslemData = {
  siteAdi: string;
  siteKodu: string;
  webAdresi: string;
  ilKodu: string;
  ilceKodu: string;
  mahalleAdi: string;
  enlem: string;
  boylam: string;
  girisTarihi: string;
  cikisTarihi: string;
  rezervasyonTutari: string;
  tahsilTarihi: string;
  komisyonIban: string;
  komisyonOrani: string;
  komisyonTutari: string;
  ownerKisiXml: string;
  ownerIban: string;
  ownerCepTel: string;
  ownerEposta: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

export function formatAmount(value: number | null | undefined): string {
  const amount = Number.isFinite(value) ? Number(value) : 0;
  return amount.toFixed(2);
}

export function escapeXml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function isWithinMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

/** Ev sahibi ad soyad / ünvan görünen adı (eksik listesi ve tablo için). */
export function getOwnerDisplayName(owner: BtransOwnerInput): string {
  if (!owner) return "";
  if (owner.type === "TUZEL_KISI") {
    return owner.companyTitle.trim() || owner.name.trim();
  }
  const fullName = `${owner.firstName.trim()} ${owner.lastName.trim()}`.trim();
  return fullName || owner.name.trim();
}

/** Zorunlu alan kontrolü: eksikse booking dosyaya alınmaz. */
export function checkMissingFields(
  owner: BtransOwnerInput,
  region: BtransRegionCodes
): string[] {
  const missing: string[] = [];

  if (!owner) {
    missing.push("Villa sahibi tanımlı değil");
    return missing;
  }

  if (owner.type === "TUZEL_KISI") {
    if (!owner.taxNumber.trim() || !getOwnerDisplayName(owner)) {
      missing.push("Ev sahibi VKN (10) + ünvan");
    }
  } else if (!owner.tcKimlikNo.trim()) {
    missing.push("Ev sahibi TC (11) — tüzelse VKN (10) + ünvan");
  }

  if (!owner.phone.trim()) {
    missing.push("Ev sahibi cep telefonu (10 hane)");
  }

  if (!owner.bankIban.trim()) {
    missing.push("IBAN (26 hane)");
  }

  if (!region.ilKodu || !region.ilceKodu) {
    missing.push("İl/İlçe kodu (Bölge tanımı eksik)");
  }

  return missing;
}

function buildOwnerKisiXml(owner: NonNullable<BtransOwnerInput>): string {
  if (owner.type === "TUZEL_KISI") {
    return [
      "        <kisi>",
      "          <tuzelKisi>",
      `            <vkn>${escapeXml(owner.taxNumber.trim())}</vkn>`,
      `            <tuzelKisiUnvan>${escapeXml(getOwnerDisplayName(owner))}</tuzelKisiUnvan>`,
      "          </tuzelKisi>",
      "        </kisi>",
    ].join("\n");
  }

  return [
    "        <kisi>",
    "          <gercekKisi>",
    "            <kimlikTipi>1</kimlikTipi>",
    `            <kimlikNumarasi>${escapeXml(owner.tcKimlikNo.trim())}</kimlikNumarasi>`,
    `            <ad>${escapeXml(owner.firstName.trim() || owner.name.trim())}</ad>`,
    `            <soyad>${escapeXml(owner.lastName.trim())}</soyad>`,
    "          </gercekKisi>",
    "        </kisi>",
  ].join("\n");
}

/** Bir <islem> bloğu üretir (gunubirlikson.xsd yapısına uygun). */
export function buildIslemXml(input: {
  siteAdi: string;
  siteKodu: string;
  webAdresi: string;
  ilKodu: string;
  ilceKodu: string;
  mahalleAdi: string;
  enlem: number;
  boylam: number;
  girisTarihi: Date;
  cikisTarihi: Date;
  rezervasyonTutari: number | null;
  tahsilTarihi: Date;
  komisyonIban: string;
  komisyonOrani: number | null;
  komisyonTutari: number | null;
  owner: NonNullable<BtransOwnerInput>;
}): string {
  return [
    "    <islem>",
    "      <ilanaKonuGayrimenkulBilgisi>",
    "        <webAdresAlani>",
    `          <siteAdi>${escapeXml(input.siteAdi)}</siteAdi>`,
    `          <siteKodu>${escapeXml(input.siteKodu)}</siteKodu>`,
    `          <webAdresi>${escapeXml(input.webAdresi)}</webAdresi>`,
    "        </webAdresAlani>",
    "        <adresAlani>",
    "          <ulke><ulkeAdi>1</ulkeAdi><digerSecimi /></ulke>",
    `          <il>${escapeXml(input.ilKodu)}</il>`,
    `          <ilce>${escapeXml(input.ilceKodu)}</ilce>`,
    `          <mahalle>${escapeXml(input.mahalleAdi)}</mahalle>`,
    "          <cadde>0</cadde>",
    "          <sokak>0</sokak>",
    "          <diskapiNo>0</diskapiNo>",
    "          <ickapiNo>0</ickapiNo>",
    "        </adresAlani>",
    "        <imarPlani><imarPlaniIcindeDegil /></imarPlani>",
    "        <zeminSistemNumarasi>0</zeminSistemNumarasi>",
    "        <yevmiyeNo>0</yevmiyeNo>",
    "        <basvuruBulunmaBilgisi><hayir /></basvuruBulunmaBilgisi>",
    "        <koordinatBilgileri>",
    `          <enlem>${input.enlem}</enlem>`,
    `          <boylam>${input.boylam}</boylam>`,
    "        </koordinatBilgileri>",
    "      </ilanaKonuGayrimenkulBilgisi>",
    "      <rezervasyonBilgileri>",
    `        <rezervasyonBasTar>${formatYYYYMMDD(input.girisTarihi)}</rezervasyonBasTar>`,
    `        <rezervasyonBitTar>${formatYYYYMMDD(input.cikisTarihi)}</rezervasyonBitTar>`,
    `        <rezervasyonTutari>${formatAmount(input.rezervasyonTutari)}</rezervasyonTutari>`,
    "        <rezervasyonParaBirimi>TRY</rezervasyonParaBirimi>",
    "      </rezervasyonBilgileri>",
    "      <odemeBilgileri>",
    "        <komisyonOdeme>",
    "          <komisyonTahsilSekli>5</komisyonTahsilSekli>",
    `          <ibanNo>${escapeXml(input.komisyonIban)}</ibanNo>`,
    `          <tahsilTar>${formatYYYYMMDD(input.tahsilTarihi)}</tahsilTar>`,
    `          <komisyonOrani>${Math.round(input.komisyonOrani ?? 0)}</komisyonOrani>`,
    `          <komisyonTutari>${formatAmount(input.komisyonTutari)}</komisyonTutari>`,
    "          <paraBirimi>TRY</paraBirimi>",
    "        </komisyonOdeme>",
    "      </odemeBilgileri>",
    "      <gayrimenkulSahipBilgi>",
    buildOwnerKisiXml(input.owner),
    `        <ibanNo>${escapeXml(input.owner.bankIban.replace(/\s+/g, "").toUpperCase())}</ibanNo>`,
    `        <ceptelNumarasi>${escapeXml(normalizeTurkishPhoneDigits(input.owner.phone))}</ceptelNumarasi>`,
    `        <eposta>${escapeXml(input.owner.email.trim())}</eposta>`,
    "      </gayrimenkulSahipBilgi>",
    "    </islem>",
  ].join("\n");
}

export function buildBtransXml(input: {
  companyTaxNumber: string;
  companyTitle: string;
  domain: string;
  year: number;
  month: number;
  islemXmlBlocks: string[];
}): string {
  const period = `${input.year}${pad2(input.month)}`;
  const bilgiTarihi = formatYYYYMMDD(new Date());
  const host = input.domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<vimveritransferi xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="gunubirlikson.xsd">',
    "  <protokol>",
    '    <genel kuruluskodu="538">',
    `      <vkn>${escapeXml(input.companyTaxNumber)}</vkn>`,
    `      <unvan>${escapeXml(input.companyTitle)}</unvan>`,
    "    </genel>",
    "    <ozel>",
    `      <bilgidonem>${period}-${period}</bilgidonem>`,
    "      <dosyano>1</dosyano>",
    `      <bilgiTarihi>${bilgiTarihi}</bilgiTarihi>`,
    `      <webAdresi>${escapeXml(host)}</webAdresi>`,
    `      <islemsayisi>${input.islemXmlBlocks.length}</islemsayisi>`,
    "    </ozel>",
    "  </protokol>",
    "  <islemler>",
    ...input.islemXmlBlocks,
    "  </islemler>",
    "</vimveritransferi>",
  ].join("\n");
}

export function buildBtransFilename(year: number, month: number): string {
  return `BTRANS_Gunubirlik_${year}${pad2(month)}.xml`;
}
