import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";

function resolvePdfFontPair(): { regular: string; bold: string } {
  const cwd = process.cwd();
  const candidates: Array<{ regular: string; bold: string }> = [
    {
      regular: path.join(cwd, "assets", "fonts", "DejaVuSans.ttf"),
      bold: path.join(cwd, "assets", "fonts", "DejaVuSans-Bold.ttf"),
    },
    {
      regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    },
    {
      regular: "C:\\Windows\\Fonts\\arial.ttf",
      bold: "C:\\Windows\\Fonts\\arialbd.ttf",
    },
  ];
  for (const pair of candidates) {
    if (existsSync(pair.regular) && existsSync(pair.bold)) return pair;
  }
  throw new Error("PDF yazı tipi bulunamadı");
}

function tagValue(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`,
    "i"
  );
  const match = xml.match(re);
  return (match?.[1] || "").replace(/<[^>]+>/g, "").trim();
}

function allTagValues(xml: string, tag: string): string[] {
  const re = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`,
    "gi"
  );
  const values: string[] = [];
  for (const match of xml.matchAll(re)) {
    const value = (match[1] || "").replace(/<[^>]+>/g, "").trim();
    if (value) values.push(value);
  }
  return values;
}

function section(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`,
    "i"
  );
  return (xml.match(re)?.[1] || "").trim();
}

function money(value: string) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return value || "—";
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return value || "—";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export type ParsedUblInvoice = {
  invoiceId: string;
  uuid: string;
  issueDate: string;
  profileId: string;
  invoiceType: string;
  supplierName: string;
  supplierVkn: string;
  supplierAddress: string;
  customerName: string;
  customerTaxId: string;
  customerAddress: string;
  lineDescription: string;
  lineAmount: string;
  taxExclusive: string;
  taxInclusive: string;
  payable: string;
  taxPercent: string;
  taxAmount: string;
};

export function parseUblInvoiceXml(xml: string): ParsedUblInvoice {
  const supplier = section(xml, "AccountingSupplierParty");
  const customer = section(xml, "AccountingCustomerParty");
  const monetary = section(xml, "LegalMonetaryTotal");
  const taxTotal = section(xml, "TaxTotal");
  const line = section(xml, "InvoiceLine");
  const supplierParty = section(supplier, "Party");
  const customerParty = section(customer, "Party");

  const supplierIds = allTagValues(supplierParty, "ID");
  const customerIds = allTagValues(customerParty, "ID");
  const supplierVkn =
    supplierIds.find((v) => /^\d{10,11}$/.test(v)) ||
    tagValue(supplierParty, "CompanyID") ||
    "";
  const customerTaxId =
    customerIds.find((v) => /^\d{10,11}$/.test(v)) ||
    tagValue(customerParty, "CompanyID") ||
    "";

  const supplierStreet = [
    tagValue(supplierParty, "StreetName"),
    tagValue(supplierParty, "BuildingName"),
    tagValue(supplierParty, "BuildingNumber"),
    tagValue(supplierParty, "CitySubdivisionName"),
    tagValue(supplierParty, "CityName"),
  ]
    .filter(Boolean)
    .join(", ");
  const customerStreet = [
    tagValue(customerParty, "StreetName"),
    tagValue(customerParty, "BuildingName"),
    tagValue(customerParty, "BuildingNumber"),
    tagValue(customerParty, "CitySubdivisionName"),
    tagValue(customerParty, "CityName"),
  ]
    .filter(Boolean)
    .join(", ");

  const customerPerson = [
    tagValue(customerParty, "FirstName"),
    tagValue(customerParty, "FamilyName"),
  ]
    .filter(Boolean)
    .join(" ");

  const invoiceIds = allTagValues(xml.slice(0, 2500), "ID");
  const invoiceId =
    invoiceIds.find((v) => /^[A-Z]{3}\d{13}$/i.test(v)) ||
    tagValue(xml, "ID");

  return {
    invoiceId,
    uuid: tagValue(xml, "UUID"),
    issueDate: tagValue(xml, "IssueDate"),
    profileId: tagValue(xml, "ProfileID"),
    invoiceType: tagValue(xml, "InvoiceTypeCode"),
    supplierName: tagValue(supplierParty, "Name") || tagValue(supplierParty, "RegistrationName"),
    supplierVkn,
    supplierAddress: supplierStreet,
    customerName:
      tagValue(customerParty, "Name") ||
      tagValue(customerParty, "RegistrationName") ||
      customerPerson,
    customerTaxId,
    customerAddress: customerStreet,
    lineDescription:
      tagValue(line, "Name") ||
      tagValue(line, "Description") ||
      "Komisyon bedeli",
    lineAmount: tagValue(line, "LineExtensionAmount"),
    taxExclusive: tagValue(monetary, "TaxExclusiveAmount"),
    taxInclusive: tagValue(monetary, "TaxInclusiveAmount"),
    payable: tagValue(monetary, "PayableAmount"),
    taxPercent: tagValue(taxTotal, "Percent"),
    taxAmount: tagValue(taxTotal, "TaxAmount"),
  };
}

export async function renderUblInvoicePdf(xml: string): Promise<Buffer> {
  const data = parseUblInvoiceXml(xml);
  const fonts = resolvePdfFontPair();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Regular", fonts.regular);
    doc.registerFont("Bold", fonts.bold);

    doc.font("Bold").fontSize(16).text("e-Fatura / e-Arşiv Görüntüsü", {
      align: "left",
    });
    doc.moveDown(0.4);
    doc.font("Regular").fontSize(10).fillColor("#444");
    doc.text(
      "Bu PDF, EDM’den alınan UBL faturasının sistemde üretilmiş görüntüsüdür."
    );
    doc.fillColor("#000");
    doc.moveDown(1);

    doc.font("Bold").fontSize(12).text("Fatura Bilgileri");
    doc.moveDown(0.3);
    doc.font("Regular").fontSize(10);
    doc.text(`Fatura No: ${data.invoiceId || "—"}`);
    doc.text(`ETTN / UUID: ${data.uuid || "—"}`);
    doc.text(`Fatura Tarihi: ${formatDate(data.issueDate)}`);
    doc.text(`Profil: ${data.profileId || "—"}`);
    doc.text(`Tür: ${data.invoiceType || "—"}`);
    doc.moveDown(1);

    const leftX = 48;
    const rightX = 310;
    const top = doc.y;

    doc.font("Bold").fontSize(11).text("Satıcı", leftX, top);
    doc.font("Regular").fontSize(9);
    doc.text(data.supplierName || "—", leftX, top + 16, { width: 240 });
    doc.text(`VKN: ${data.supplierVkn || "—"}`, leftX, doc.y + 4, {
      width: 240,
    });
    doc.text(data.supplierAddress || "—", leftX, doc.y + 4, { width: 240 });

    const afterLeft = doc.y;
    doc.font("Bold").fontSize(11).text("Alıcı", rightX, top);
    doc.font("Regular").fontSize(9);
    doc.text(data.customerName || "—", rightX, top + 16, { width: 240 });
    doc.text(`VKN/TCKN: ${data.customerTaxId || "—"}`, rightX, doc.y + 4, {
      width: 240,
    });
    doc.text(data.customerAddress || "—", rightX, doc.y + 4, { width: 240 });
    doc.y = Math.max(afterLeft, doc.y) + 18;

    doc.font("Bold").fontSize(11).text("Kalem");
    doc.moveDown(0.3);
    doc.font("Regular").fontSize(10);
    doc.text(data.lineDescription || "—");
    doc.moveDown(0.8);

    const rows: Array<[string, string]> = [
      ["Mal/Hizmet Tutarı", money(data.lineAmount || data.taxExclusive)],
      ["KDV Oranı", data.taxPercent ? `%${data.taxPercent}` : "—"],
      ["KDV Tutarı", money(data.taxAmount)],
      ["Vergiler Hariç", money(data.taxExclusive)],
      ["Vergiler Dahil", money(data.taxInclusive)],
      ["Ödenecek Tutar", money(data.payable)],
    ];

    for (const [label, value] of rows) {
      const y = doc.y;
      doc.font("Regular").text(label, 48, y, { width: 280 });
      doc.font("Bold").text(value, 330, y, { width: 180, align: "right" });
      doc.moveDown(0.35);
    }

    doc.moveDown(1.5);
    doc.font("Regular").fontSize(8).fillColor("#666");
    doc.text(
      "Resmi görüntü için EDM portalını da kullanabilirsiniz. Bu dosya operasyonel arşiv amaçlıdır.",
      { width: 500 }
    );

    doc.end();
  });
}
