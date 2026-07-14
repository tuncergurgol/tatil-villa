import PDFDocument from "pdfkit";
import path from "path";
import { formatMoneyPlain } from "@/lib/booking-display";

const FONT_REGULAR = path.join(process.cwd(), "assets", "fonts", "Arial.ttf");
const FONT_BOLD = path.join(process.cwd(), "assets", "fonts", "Arial-Bold.ttf");

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
    agencyName: string;
    companyTitle: string;
    tursabNo: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
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

function drawPaymentRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  hint?: string
): void {
  ensureSpace(doc, hint ? 28 : 18);
  const y = doc.y;
  doc
    .font("Regular")
    .fontSize(9)
    .fillColor("#334155")
    .text(label, MARGIN, y, { width: CONTENT_WIDTH - 140 });
  doc
    .font("Bold")
    .fontSize(9)
    .fillColor("#0f172a")
    .text(value, MARGIN + CONTENT_WIDTH - 130, y, {
      width: 130,
      align: "right",
    });
  if (hint) {
    doc
      .font("Regular")
      .fontSize(7.5)
      .fillColor("#64748b")
      .text(hint, MARGIN, y + 11, { width: CONTENT_WIDTH - 140 });
  }
  doc.y = Math.max(doc.y, y + (hint ? 24 : 14));
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

/**
 * Rezervasyon konfirme belgesi + online sözleşme PDF buffer’ı üretir.
 * Dosyaya yazmaz.
 */
export function buildReservationDocumentPdf(
  data: ReservationDocumentData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: `Rezervasyon Belgesi ${data.reservationCode}`,
        Author: data.company.companyTitle || data.company.brandName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont("Regular", FONT_REGULAR);
      doc.registerFont("Bold", FONT_BOLD);
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("PDF yazı tipi yüklenemedi (assets/fonts/Arial*.ttf)")
      );
      return;
    }

    // —— Üst başlık ——
    doc
      .font("Bold")
      .fontSize(12)
      .fillColor("#0f172a")
      .text(data.company.brandName || "tatildeyiz.com.tr", {
        align: "left",
      });
    doc
      .font("Regular")
      .fontSize(9)
      .fillColor("#475569")
      .text(data.company.agencyName || "", { align: "left" });
    doc
      .font("Regular")
      .fontSize(8.5)
      .fillColor("#64748b")
      .text(formatDocDate(data.issuedAt), { align: "left" });
    if (data.company.tursabNo) {
      doc.text(`TURSAB No: ${data.company.tursabNo}`);
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
            MARGIN,
            doc.y
          );
      });
    }

    doc.moveDown(0.5);
    ensureSpace(doc, 22);
    doc
      .font("Bold")
      .fontSize(10)
      .fillColor("#15803d")
      .text("✓  Rezervasyonunuz konfirme edilmiştir.", MARGIN, doc.y);

    drawSectionTitle(doc, "ÖNEMLİ BİLGİLER");
    const important = [
      "Kimlik ibrazı zorunludur.",
      "İptal ve değişiklik koşulları satış sözleşmesine tabidir.",
      "Giriş tarihinizden 1 gün önce size tesis yetkilisi iletişim bilgileri iletilecektir. O güne kadar bizimle iletişime geçebilirsiniz.",
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
    drawPaymentRow(
      doc,
      "Konaklama (Net)",
      moneyOrDash(data.payments.netAccommodation)
    );
    drawPaymentRow(
      doc,
      "Rezervasyon Toplamı",
      moneyOrDash(data.payments.reservationTotal)
    );
    drawPaymentRow(
      doc,
      "Hasar Depozitosu",
      moneyOrDash(data.payments.damageDeposit),
      "(Girişte nakit alınır, hasarsız çıkışta iade)"
    );
    drawPaymentRow(
      doc,
      "Ön Ödeme",
      moneyOrDash(data.payments.prepayment),
      "(Rezervasyon onayında alınan)"
    );
    drawPaymentRow(
      doc,
      "Ön Ödeme Şekli",
      data.payments.prepaymentMethodLabel || "—"
    );
    drawPaymentRow(
      doc,
      "Kapıda Kalan Ödeme",
      moneyOrDash(data.payments.remainingAtCheckIn),
      "(Girişte tesis yetkilisine ödenecektir)"
    );

    doc.moveDown(0.4);
    const footnotes = [
      "Lütfen tesise giriş saatinizi varış tarihinizden önce tarafımıza bildiriniz.",
      "Konaklama yapacak tüm kişilerin kimlik bilgilerini, giriş gününde tesis sahibine veya yetkilisine bildirmeniz gerekmektedir.",
    ];
    for (const note of footnotes) {
      ensureSpace(doc, 16);
      doc
        .font("Regular")
        .fontSize(8)
        .fillColor("#64748b")
        .text(`* ${note}`, MARGIN, doc.y, { width: CONTENT_WIDTH });
    }

    // —— Şirket bloğu ——
    doc.moveDown(0.8);
    ensureSpace(doc, 70);
    doc
      .font("Bold")
      .fontSize(9)
      .fillColor("#0f172a")
      .text(
        data.company.companyTitle ||
          "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ",
        { align: "center" }
      );
    if (data.company.tursabNo) {
      doc
        .font("Regular")
        .fontSize(8)
        .fillColor("#475569")
        .text(`TURSAB NO: ${data.company.tursabNo}`, { align: "center" });
    }
    doc
      .font("Regular")
      .fontSize(8)
      .fillColor("#475569")
      .text(`Merkez Ofis: ${data.company.address}`, {
        align: "center",
        width: CONTENT_WIDTH,
      });
    doc.text(`Telefon: ${data.company.phone}`, { align: "center" });
    if (data.company.whatsapp) {
      doc.text(`WhatsApp: ${data.company.whatsapp.replace(/\s+/g, "")}`, {
        align: "center",
      });
    }
    doc.text(`E-posta: ${data.company.email}`, { align: "center" });

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
    ensureSpace(doc, 90);
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
    doc
      .font("Regular")
      .fontSize(8.5)
      .fillColor("#334155")
      .text(
        data.company.companyTitle ||
          "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ",
        MARGIN + colWidth + 24,
        startY + 14,
        { width: colWidth }
      );
    if (data.company.tursabNo) {
      doc.text(`TURSAB: ${data.company.tursabNo}`, {
        width: colWidth,
      });
    }
    doc.text(data.company.address, { width: colWidth });
    doc.y = Math.max(leftBottom, doc.y);

    doc.end();
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
      regionLabel: "Fethiye Merkeze Yakın",
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
      phone: "+90 252 618 01 08",
      whatsapp: "+902526180108",
      email: "info@tatildeyiz.com.tr",
    },
    contractBody:
      'İşbu Online Rezervasyon ve Kiralama sözleşmesi ("sözleşme") internet ortamında hazırlanmış olup misafir "*******0638" T.C. Kimlik numaralı "Emre YANARDAĞ" (MİSAFİR) ve "Bungalov Masal" adlı taşınmazın kiralanması şeklindedir.\n\nTanımlar ve Sözleşme Konusu\nSÖZLEŞME ve MİSAFİR tanımları işbu belgede yer almaktadır.\n\nİptal Şartları\nOnaylanan rezervasyonlarda iptal ve tarih değiştirme hakkı bulunmamaktadır.',
  };
  return { ...base, ...overrides };
}
