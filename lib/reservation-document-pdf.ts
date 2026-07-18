import PDFDocument from "pdfkit";
import { access, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { formatMoneyPlain } from "@/lib/booking-display";

const FONT_REGULAR = path.join(process.cwd(), "assets", "fonts", "Arial.ttf");
const FONT_BOLD = path.join(process.cwd(), "assets", "fonts", "Arial-Bold.ttf");
const DEFAULT_LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "uploads",
  "company",
  "logo-1783080885848.svg"
);

const MARGIN = 48;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export type ReservationDocumentGuestRow = {
  fullName: string;
  identityMasked: string;
  category: "adult" | "child" | "baby";
};

export type ReservationDocumentData = {
  reservationCode: string;
  issuedAt: Date;
  confirmedAt: Date;
  clientIp?: string;
  guest: {
    fullName: string;
    identityMasked: string;
    phone: string;
    email: string;
    address: string;
  };
  stay: {
    villaName: string;
    regionLabel: string;
    checkIn: Date;
    checkOut: Date;
    checkInTime: string;
    checkOutTime: string;
    nights: number;
    adults: number;
    children: number;
    babies: number;
  };
  guestRows: ReservationDocumentGuestRow[];
  payments: {
    grossPrice: number | null;
    periodDiscount: number | null;
    otherDiscount: number | null;
    netAccommodation: number | null;
    reservationTotal: number | null;
    damageDeposit: number | null;
    prepayment: number | null;
    prepaymentMethodLabel: string;
    remainingAtCheckIn: number | null;
  };
  company: {
    brandName: string;
    domain?: string;
    agencyName: string;
    companyTitle: string;
    tursabNo: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    logoUrl?: string;
    taxOffice?: string;
    taxNumber?: string;
  };
  /** Placeholder’ları uygulanmış sözleşme gövdesi */
  contractBody: string;
};

function formatDocDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStayDateTime(date: Date, time: string): string {
  const dayMonthYear = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const weekday = date.toLocaleDateString("tr-TR", { weekday: "long" });
  const capitalized =
    weekday.charAt(0).toLocaleUpperCase("tr-TR") + weekday.slice(1);
  return `${dayMonthYear} - ${capitalized} - ${time || "—"}`;
}

function guestCountLabel(stay: ReservationDocumentData["stay"]): string {
  const parts: string[] = [];
  if (stay.adults > 0) parts.push(`${stay.adults} Yetişkin`);
  if (stay.children > 0) parts.push(`${stay.children} Çocuk`);
  if (stay.babies > 0) parts.push(`${stay.babies} Bebek`);
  return parts.join(", ") || "—";
}

function categoryHeading(
  rows: ReservationDocumentGuestRow[],
  category: ReservationDocumentGuestRow["category"]
): string | null {
  const filtered = rows.filter((row) => row.category === category);
  if (filtered.length === 0) return null;
  if (category === "adult") return "YETİŞKİN";
  if (category === "child") return "ÇOCUK";
  return "BEBEK";
}

function moneyOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatMoneyPlain(value);
}

function discountLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `− ${formatMoneyPlain(value)}`;
}

function hasAnyDiscount(payments: ReservationDocumentData["payments"]): boolean {
  return (
    (payments.periodDiscount ?? 0) > 0 || (payments.otherDiscount ?? 0) > 0
  );
}

function titleCaseTaxOffice(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .toLocaleLowerCase("tr-TR")
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

/** Konfirme altı şirket bloğu — sabit, ortalanmış içerik */
function companyFooterLines(
  company: ReservationDocumentData["company"]
): string[] {
  const title =
    company.companyTitle ||
    "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ";
  const splitMatch = title.match(/^(.+?\bEMLAK)\s+(.+)$/i);
  const titleLines = splitMatch
    ? [splitMatch[1]!.trim(), splitMatch[2]!.trim()]
    : [title];

  const tursab = (company.tursabNo || "12970").trim();
  const phone = (company.phone || "+90 252 618 0108").trim();
  const email = (company.email || "info@tatildeyiz.com.tr").trim();

  return [
    ...titleLines,
    `TURSAB NO: ${tursab}`,
    `Telefon / WhatsApp: ${phone}`,
    `E-posta: ${email}`,
  ];
}

/** Son sayfa KİRAYA VEREN TARAF — adres + vergi / Tursab (telefon yok) */
function formatKirayaVerenLines(
  company: ReservationDocumentData["company"]
): string[] {
  const title =
    company.companyTitle ||
    "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ";
  // İki satıra böl: "... EMLAK" / "YATIRIMLARI ..."
  const splitMatch = title.match(/^(.+?\bEMLAK)\s+(.+)$/i);
  const titleLines = splitMatch
    ? [splitMatch[1]!.trim(), splitMatch[2]!.trim()]
    : [title];

  const address =
    company.address ||
    "Girmeler Mah. Nacaklar Sok. No:8/1 D:3 Seydikemer / Muğla";

  const taxOffice = titleCaseTaxOffice(company.taxOffice || "Seydikemer");
  const taxNumber = (company.taxNumber || "6231137867").trim();
  const tursab = (company.tursabNo || "12970").trim();
  const taxLine = `${taxOffice} V.D.-${taxNumber} (Tursab No: ${tursab})`;

  return [...titleLines, address, taxLine];
}

function toPublicLogoPath(logoUrl: string | null | undefined): string | null {
  let pathname = (logoUrl ?? "").trim();
  if (!pathname) return DEFAULT_LOGO_PATH;

  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return DEFAULT_LOGO_PATH;
    }
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.includes("..") || pathname.includes("\\")) {
    return DEFAULT_LOGO_PATH;
  }

  return path.join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

async function loadLogoPngBuffer(
  logoUrl: string | null | undefined
): Promise<Buffer | null> {
  const candidates = [
    toPublicLogoPath(logoUrl),
    DEFAULT_LOGO_PATH,
  ].filter((p): p is string => Boolean(p));

  for (const filePath of candidates) {
    try {
      await access(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".svg") {
        return await sharp(filePath).png().toBuffer();
      }
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        return await readFile(filePath);
      }
    } catch {
      // sonraki adaya düş
    }
  }
  return null;
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  needed: number,
  bottom = 56
): void {
  if (doc.y + needed > doc.page.height - bottom) {
    doc.addPage();
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 28);
  doc
    .moveDown(0.4)
    .font("Bold")
    .fontSize(11)
    .fillColor("#0f172a")
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
  const y = doc.y + 2;
  doc
    .strokeColor("#cbd5e1")
    .lineWidth(0.8)
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y)
    .stroke();
  doc.moveDown(0.45);
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  options?: { valueBold?: boolean }
): void {
  ensureSpace(doc, 18);
  const y = doc.y;
  const labelWidth = 180;
  doc
    .font("Regular")
    .fontSize(9)
    .fillColor("#475569")
    .text(label, MARGIN, y, { width: labelWidth, continued: false });
  doc
    .font(options?.valueBold ? "Bold" : "Regular")
    .fontSize(9)
    .fillColor("#0f172a")
    .text(value || "—", MARGIN + labelWidth, y, {
      width: CONTENT_WIDTH - labelWidth,
    });
  doc.y = Math.max(doc.y, y + 14);
}

/** Ödeme satırı: etiket solda, tutar sağda — tek point ve Regular kalınlık */
function drawPaymentRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string
): void {
  ensureSpace(doc, 28);
  const y = doc.y;
  const valueWidth = 110;
  const labelWidth = CONTENT_WIDTH - valueWidth - 6;
  const pt = 9;
  doc
    .font("Regular")
    .fontSize(pt)
    .fillColor("#334155")
    .text(label, MARGIN, y, { width: labelWidth });
  const afterLabelY = doc.y;
  doc
    .font("Regular")
    .fontSize(pt)
    .fillColor("#0f172a")
    .text(value, MARGIN + labelWidth + 6, y, {
      width: valueWidth,
      align: "right",
      lineBreak: false,
    });
  doc.y = Math.max(afterLabelY, doc.y, y + 14);
}

function drawWrappedParagraph(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: { bold?: boolean; size?: number; color?: string }
): void {
  ensureSpace(doc, 36);
  doc
    .font(options?.bold ? "Bold" : "Regular")
    .fontSize(options?.size ?? 8.5)
    .fillColor(options?.color ?? "#1e293b")
    .text(text, MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      align: "justify",
      lineGap: 1.5,
    });
  doc.moveDown(0.35);
}

function drawConfirmationLine(doc: PDFKit.PDFDocument): void {
  ensureSpace(doc, 22);
  const y = doc.y;
  const cx = MARGIN + 6;
  const cy = y + 6;

  doc.save();
  doc.circle(cx, cy, 6.5).fillColor("#16a34a").fill();
  doc
    .strokeColor("#ffffff")
    .lineWidth(1.5)
    .lineCap("round")
    .lineJoin("round")
    .moveTo(cx - 3.2, cy + 0.2)
    .lineTo(cx - 0.8, cy + 2.6)
    .lineTo(cx + 3.6, cy - 2.4)
    .stroke();
  doc.restore();

  doc
    .font("Bold")
    .fontSize(10)
    .fillColor("#15803d")
    .text("Rezervasyonunuz konfirme edilmiştir.", MARGIN + 18, y, {
      width: CONTENT_WIDTH - 18,
    });
}

/**
 * Rezervasyon konfirme belgesi + online sözleşme PDF buffer’ı üretir.
 * Dosyaya yazmaz.
 */
export async function buildReservationDocumentPdf(
  data: ReservationDocumentData
): Promise<Buffer> {
  const logoBuffer = await loadLogoPngBuffer(data.company.logoUrl);

  return new Promise((resolve, reject) => {
    let doc: PDFKit.PDFDocument;
    try {
      // Varsayılan Helvetica AFM’ye dokunma: Next webpack bundle’da
      // node_modules/pdfkit/js/data yolu .next/vendor-chunks altına kırılıyor.
      doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        font: FONT_REGULAR,
        info: {
          Title: `Rezervasyon Belgesi ${data.reservationCode}`,
          Author: data.company.companyTitle || data.company.brandName,
        },
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("PDF belgesi başlatılamadı (Arial font / pdfkit)")
      );
      return;
    }

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont("Regular", FONT_REGULAR);
      doc.registerFont("Bold", FONT_BOLD);
      doc.font("Regular");

      // —— Üst başlık: logo + ajans solda, tarih sağda ——
      const headerTop = doc.y;
      const dateStr = formatDocDate(data.issuedAt);
      doc
        .font("Regular")
        .fontSize(8.5)
        .fillColor("#64748b")
        .text(dateStr, MARGIN, headerTop, {
          width: CONTENT_WIDTH,
          align: "right",
          lineBreak: false,
        });

      let leftY = headerTop;
      if (logoBuffer) {
        const logoW = 128;
        const logoH = 38;
        doc.image(logoBuffer, MARGIN, headerTop, {
          fit: [logoW, logoH],
        });
        leftY = headerTop + logoH + 4;
      } else {
        doc
          .font("Bold")
          .fontSize(12)
          .fillColor("#0f172a")
          .text(data.company.brandName || "tatildeyiz.com.tr", MARGIN, headerTop, {
            width: CONTENT_WIDTH * 0.65,
            align: "left",
          });
        leftY = doc.y + 2;
      }

      doc
        .font("Regular")
        .fontSize(9)
        .fillColor("#475569")
        .text(data.company.agencyName || "", MARGIN, leftY, {
          width: CONTENT_WIDTH * 0.7,
          align: "left",
        });
      if (data.company.tursabNo) {
        doc
          .font("Regular")
          .fontSize(8.5)
          .fillColor("#64748b")
          .text(`TURSAB No: ${data.company.tursabNo}`, MARGIN, doc.y, {
            width: CONTENT_WIDTH * 0.7,
          });
      }

      doc.moveDown(0.8);
      doc
        .font("Bold")
        .fontSize(14)
        .fillColor("#0f172a")
        .text("REZERVASYON KONFİRME BELGESİ", { align: "center" });
      doc.moveDown(0.35);
      doc
        .font("Bold")
        .fontSize(11)
        .fillColor("#0f766e")
        .text(`REZERVASYON NUMARASI (PNR)  ${data.reservationCode}`, {
          align: "center",
        });

      // —— Misafir bilgileri ——
      drawSectionTitle(doc, "MİSAFİR BİLGİLERİ");
      drawKeyValue(doc, "Adı Soyadı", data.guest.fullName, { valueBold: true });
      drawKeyValue(doc, "TC Kimlik / Pasaport No", data.guest.identityMasked);
      drawKeyValue(doc, "Telefon No", data.guest.phone);
      drawKeyValue(doc, "E-Posta", data.guest.email);
      drawKeyValue(doc, "Adres", data.guest.address);

      // —— Konaklama ——
      drawSectionTitle(doc, "KONAKLAMA BİLGİLERİ");
      drawKeyValue(doc, "Tesis Adı", data.stay.villaName, { valueBold: true });
      drawKeyValue(doc, "Bölgesi", data.stay.regionLabel || "—");
      drawKeyValue(
        doc,
        "Giriş Tarihi (Check-in)",
        formatStayDateTime(data.stay.checkIn, data.stay.checkInTime)
      );
      drawKeyValue(
        doc,
        "Çıkış Tarihi (Check-out)",
        formatStayDateTime(data.stay.checkOut, data.stay.checkOutTime)
      );
      drawKeyValue(doc, "Geceleme Sayısı", `${data.stay.nights} Gece`);
      drawKeyValue(doc, "Misafir Sayısı", guestCountLabel(data.stay));

      doc.moveDown(0.25);
      doc
        .font("Bold")
        .fontSize(9)
        .fillColor("#0f172a")
        .text("Konaklayacak Kişiler", MARGIN, doc.y);

      // Kategori başlıkları solda; numaralı isimler bir sekme girintili
      const GUEST_NAME_INDENT = 36;
      const categories: Array<ReservationDocumentGuestRow["category"]> = [
        "adult",
        "child",
        "baby",
      ];
      for (const category of categories) {
        const heading = categoryHeading(data.guestRows, category);
        if (!heading) continue;
        doc
          .font("Bold")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(heading, MARGIN, doc.y + 4);
        const rows = data.guestRows.filter((row) => row.category === category);
        rows.forEach((row, index) => {
          ensureSpace(doc, 14);
          doc
            .font("Regular")
            .fontSize(9)
            .fillColor("#0f172a")
            .text(
              `${index + 1}- ${row.fullName}  ${row.identityMasked || ""}`.trim(),
              MARGIN + GUEST_NAME_INDENT,
              doc.y,
              { width: CONTENT_WIDTH - GUEST_NAME_INDENT }
            );
        });
      }

      // Konfirme satırı: üstte ve altta birer boş satır
      doc.moveDown(1);
      drawConfirmationLine(doc);
      doc.moveDown(1);

      drawSectionTitle(doc, "ÖNEMLİ BİLGİLER");
      const important = [
        "Villa girişi esnasında konaklayacak tüm misafirlerin Kimlik ibrazı zorunludur.",
        "Rezervasyon formunda yazılı değil ise evcil hayvanınızı yanınızda tatile getirmeyin.",
        "İptal ve değişiklik koşulları satış sözleşmesine tabidir.",
        "Giriş tarihinizden 1 gün önce size tesis yetkilisi iletişim bilgileri iletilecektir. O güne kadar bizimle iletişimde kalabilirsiniz.",
      ];
      for (const line of important) {
        ensureSpace(doc, 16);
        doc
          .font("Regular")
          .fontSize(8.5)
          .fillColor("#334155")
          .text(`• ${line}`, MARGIN, doc.y, { width: CONTENT_WIDTH });
      }

      // —— Ödeme ——
      drawSectionTitle(doc, "ÖDEME BİLGİLERİ");
      drawPaymentRow(
        doc,
        "Konaklama Bedeli",
        moneyOrDash(data.payments.grossPrice)
      );
      if ((data.payments.periodDiscount ?? 0) > 0) {
        drawPaymentRow(
          doc,
          "Dönem İndirimi",
          discountLabel(data.payments.periodDiscount)
        );
      }
      if ((data.payments.otherDiscount ?? 0) > 0) {
        drawPaymentRow(
          doc,
          "İndirim Tutarı",
          discountLabel(data.payments.otherDiscount)
        );
      }
      if (hasAnyDiscount(data.payments)) {
        drawPaymentRow(
          doc,
          "İndirimli Konaklama Bedeli",
          moneyOrDash(data.payments.netAccommodation)
        );
      }
      drawPaymentRow(
        doc,
        "Rezervasyon Toplamı",
        moneyOrDash(data.payments.reservationTotal)
      );

      // 1 boş satır: Rezervasyon Toplamı ↔ Hasar Depozitosu
      doc.moveDown(1);
      drawPaymentRow(
        doc,
        "Hasar Depozitosu (Girişte nakit alınır, hasarsız çıkışta iade)",
        moneyOrDash(data.payments.damageDeposit)
      );

      // 1 boş satır: Hasar Depozitosu ↔ Ön Ödeme
      doc.moveDown(1);
      drawPaymentRow(
        doc,
        "Ön Ödeme (Rezervasyon onayında alınan)",
        moneyOrDash(data.payments.prepayment)
      );
      drawPaymentRow(
        doc,
        "Ön Ödeme Şekli",
        data.payments.prepaymentMethodLabel || "—"
      );
      drawPaymentRow(
        doc,
        "Kapıda Kalan Ödeme (Girişte villa yetkilisine ödenecektir)",
        moneyOrDash(data.payments.remainingAtCheckIn)
      );

      // —— Şirket bloğu (sayfa ortası) ——
      doc.moveDown(0.8);
      ensureSpace(doc, 70);
      const footerLines = companyFooterLines(data.company);
      footerLines.forEach((line, index) => {
        const isTitle = index < 2 && !line.startsWith("TURSAB");
        doc
          .font(isTitle ? "Bold" : "Regular")
          .fontSize(9)
          .fillColor(isTitle ? "#0f172a" : "#475569")
          .text(line, MARGIN, doc.y, {
            width: CONTENT_WIDTH,
            align: "center",
          });
      });

      // —— Sözleşme ——
      doc.addPage();
      doc
        .font("Bold")
        .fontSize(13)
        .fillColor("#0f172a")
        .text("ONLİNE REZERVASYON SÖZLEŞMESİ", { align: "center" });
      doc
        .font("Regular")
        .fontSize(9)
        .fillColor("#64748b")
        .text("(Mesafeli Rezervasyon ve Kiralama Sözleşmesi)", {
          align: "center",
        });
      doc.moveDown(0.6);

      const paragraphs = data.contractBody
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      for (const paragraph of paragraphs) {
        const lines = paragraph.split("\n").map((line) => line.trim());
        const isHeading =
          lines.length === 1 &&
          lines[0]!.length < 80 &&
          !lines[0]!.endsWith(".") &&
          /^[A-ZÇĞİÖŞÜ0-9]/.test(lines[0]!) &&
          !lines[0]!.includes(" : ");

        if (isHeading) {
          ensureSpace(doc, 22);
          doc
            .moveDown(0.25)
            .font("Bold")
            .fontSize(10)
            .fillColor("#0f172a")
            .text(lines[0]!, MARGIN, doc.y, { width: CONTENT_WIDTH });
          doc.moveDown(0.25);
          continue;
        }

        for (const line of lines) {
          if (!line) continue;
          drawWrappedParagraph(doc, line);
        }
      }

      doc.moveDown(0.6);
      const acceptDate = formatDocDate(data.confirmedAt);
      const ipNote = data.clientIp?.trim()
        ? ` IP adresi (${data.clientIp.trim()}) üzerinden`
        : " IP adresi üzerinden";
      drawWrappedParagraph(
        doc,
        `${acceptDate} tarihinde yukarıdaki online rezervasyon sözleşmesini ve KVKK aydınlatma metnimizi${ipNote} okuyup kabul ettiğiniz kayıtlarımıza alınmıştır.`,
        { size: 8.5 }
      );

      doc.moveDown(0.8);
      ensureSpace(doc, 110);
      const colWidth = (CONTENT_WIDTH - 24) / 2;
      const startY = doc.y;
      doc
        .font("Bold")
        .fontSize(9)
        .fillColor("#0f172a")
        .text("KİRALAYAN TARAF", MARGIN, startY, { width: colWidth });
      doc
        .font("Regular")
        .fontSize(8.5)
        .fillColor("#334155")
        .text(data.guest.fullName, MARGIN, doc.y + 4, { width: colWidth })
        .text(`TC Kimlik / Pasaport: ${data.guest.identityMasked}`, {
          width: colWidth,
        })
        .text(data.guest.email, { width: colWidth });

      const leftBottom = doc.y;
      doc
        .font("Bold")
        .fontSize(9)
        .fillColor("#0f172a")
        .text("KİRAYA VEREN TARAF", MARGIN + colWidth + 24, startY, {
          width: colWidth,
        });

      let rightY = startY + 14;
      const kirayaVerenLines = formatKirayaVerenLines(data.company);
      for (const line of kirayaVerenLines) {
        doc
          .font("Regular")
          .fontSize(8.5)
          .fillColor("#334155")
          .text(line, MARGIN + colWidth + 24, rightY, { width: colWidth });
        rightY = doc.y;
      }
      doc.y = Math.max(leftBottom, rightY);

      doc.end();
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error(
              "PDF yazı tipi / belge üretimi başarısız (assets/fonts/Arial*.ttf)"
            )
      );
    }
  });
}

/** Kimlik numarasını örnek PDF gibi maskeler (*******0638). */
export function maskIdentityNumber(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "—";
  if (value.length <= 4) return "*".repeat(Math.max(4, value.length));
  const visible = value.slice(-4);
  return `${"*".repeat(Math.min(7, value.length - 4))}${visible}`;
}

/** Smoke / test için minimal örnek veri. */
export function buildSampleReservationDocumentData(
  overrides?: Partial<ReservationDocumentData>
): ReservationDocumentData {
  const base: ReservationDocumentData = {
    reservationCode: "116004",
    issuedAt: new Date("2026-07-13T12:00:00+03:00"),
    confirmedAt: new Date("2026-06-24T12:00:00+03:00"),
    clientIp: "127.0.0.1",
    guest: {
      fullName: "Emre YANARDAĞ",
      identityMasked: "*******0638",
      phone: "905343089267",
      email: "emre2131445@hotmail.com",
      address:
        "Gazligol caddesi dervişpaşa mahallesi yanardağ apartmanı no 86",
    },
    stay: {
      villaName: "Bungalov Masal",
      regionLabel: "Kayaköy, Fethiye, Muğla",
      checkIn: new Date("2026-06-24T00:00:00+03:00"),
      checkOut: new Date("2026-06-27T00:00:00+03:00"),
      checkInTime: "16:00",
      checkOutTime: "10:00",
      nights: 3,
      adults: 2,
      children: 0,
      babies: 0,
    },
    guestRows: [
      {
        fullName: "Emre YANARDAĞ",
        identityMasked: "*******0638",
        category: "adult",
      },
      {
        fullName: "Dudu YANARDAĞ",
        identityMasked: "*******3948",
        category: "adult",
      },
    ],
    payments: {
      grossPrice: 21000,
      periodDiscount: 3150,
      otherDiscount: 2850,
      netAccommodation: 15000,
      reservationTotal: 15000,
      damageDeposit: 3000,
      prepayment: 3000,
      prepaymentMethodLabel: "Kredi Kartı",
      remainingAtCheckIn: 12000,
    },
    company: {
      brandName: "tatildeyiz.com.tr",
      agencyName: "Glamping Turizm Seyahat Acentesi",
      companyTitle:
        "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ",
      tursabNo: "12970",
      address: "Girmeler Mah. Nacaklar Sok. No:8/1 D:3 Seydikemer / Muğla",
      phone: "+90 252 618 0108",
      whatsapp: "+902526180108",
      email: "info@tatildeyiz.com.tr",
      logoUrl: "/uploads/company/logo-1783080885848.svg",
      taxOffice: "Seydikemer",
      taxNumber: "6231137867",
    },
    contractBody:
      'İşbu Online Rezervasyon ve Kiralama sözleşmesi ("sözleşme") internet ortamında hazırlanmış olup misafir "*******0638" T.C. Kimlik numaralı "Emre YANARDAĞ" (MİSAFİR) ve "Bungalov Masal" adlı taşınmazın kiralanması şeklindedir.\n\nTanımlar ve Sözleşme Konusu\nSÖZLEŞME ve MİSAFİR tanımları işbu belgede yer almaktadır.\n\nİptal Şartları\nOnaylanan rezervasyonlarda iptal ve tarih değiştirme hakkı bulunmamaktadır.',
  };
  return { ...base, ...overrides };
}
