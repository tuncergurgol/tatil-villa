/**
 * Yerel EDM UBL klasörünü parse eder, rezervasyonlarla eşleştirir,
 * production DB'ye SENT yazar ve GİB PDF üretir.
 *
 * Çalıştırma (production sunucuda, klasör scp sonrası):
 *   npx tsx scripts/import-edm-ubl-folder.ts /path/to/folder
 */
import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { renderInvoicePdfPreferOfficial } from "@/lib/edm/official-invoice-pdf";
import { renderUblInvoicePdf } from "@/lib/edm/ubl-invoice-pdf";

type ParsedInvoice = {
  fileName: string;
  invoiceId: string;
  uuid: string;
  profileId: string;
  eArchive: boolean;
  issueDate: string;
  note: string;
  reservationNo: number | null;
};

function tagValue(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:[\\w]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w]+:)?${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return (m?.[1] || "").trim();
}

function allNotes(xml: string): string[] {
  const re =
    /<(?:[\w]+:)?Note\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?Note>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const text = m[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

function parseReservationNo(notes: string[]): number | null {
  for (const note of notes) {
    // "115432 - İsim - Villa - ..." veya "Not: 115482 - ..."
    const m = note.match(/(?:^|\b)(\d{5,7})\s*[-–—]/);
    if (m) return Number(m[1]);
  }
  return null;
}

async function parseFolder(dir: string): Promise<ParsedInvoice[]> {
  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".xml"));
  const rows: ParsedInvoice[] = [];
  for (const fileName of files) {
    const xml = await readFile(path.join(dir, fileName), "utf8");
    const notes = allNotes(xml);
    const invoiceId =
      tagValue(xml, "ID").match(/^[A-Z]{3}\d{13}$/i)?.[0] ||
      (fileName.match(/^(TE[AF]\d{13})/i)?.[1] || "");
    const uuid =
      tagValue(xml, "UUID") ||
      (fileName.match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      )?.[1] || "");
    const profileId = tagValue(xml, "ProfileID");
    rows.push({
      fileName,
      invoiceId,
      uuid,
      profileId,
      eArchive: /EARSIV/i.test(profileId),
      issueDate: tagValue(xml, "IssueDate"),
      note: notes.find((n) => /\d{5,7}\s*[-–—]/.test(n)) || notes[0] || "",
      reservationNo: parseReservationNo(notes),
    });
  }
  return rows.sort((a, b) => a.invoiceId.localeCompare(b.invoiceId));
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Kullanım: npx tsx scripts/import-edm-ubl-folder.ts <klasör>");
    process.exit(1);
  }

  const parsed = await parseFolder(dir);
  console.log(`XML sayısı: ${parsed.length}`);

  const missingNote = parsed.filter((p) => !p.reservationNo);
  if (missingNote.length) {
    console.log("NOT'ta rezervasyon no bulunamayanlar:");
    for (const p of missingNote) {
      console.log(`  ${p.invoiceId} note="${p.note.slice(0, 80)}"`);
    }
  }

  const byRes = new Map<number, ParsedInvoice[]>();
  for (const p of parsed) {
    if (!p.reservationNo) continue;
    const list = byRes.get(p.reservationNo) || [];
    list.push(p);
    byRes.set(p.reservationNo, list);
  }

  const codes = [...byRes.keys()];
  const bookings = await prisma.booking.findMany({
    where: { externalCode: { in: codes } },
    select: { id: true, externalCode: true, details: true },
  });
  const bookingByCode = new Map(
    bookings.map((b) => [b.externalCode!, b] as const)
  );

  const outDir = path.join(process.cwd(), "storage", "edm-invoices");
  await mkdir(outDir, { recursive: true });

  const summary = {
    matched: 0,
    updated: 0,
    pdfOk: 0,
    pdfFail: 0,
    notFound: [] as number[],
    duplicates: [] as number[],
    errors: [] as string[],
  };

  for (const [code, invoices] of byRes) {
    if (invoices.length > 1) {
      summary.duplicates.push(code);
      console.warn(
        `UYARI: ${code} için ${invoices.length} fatura: ${invoices
          .map((i) => i.invoiceId)
          .join(", ")} — sonuncusu kullanılacak`
      );
    }
    const inv = invoices[invoices.length - 1];
    const booking = bookingByCode.get(code);
    if (!booking) {
      summary.notFound.push(code);
      continue;
    }
    summary.matched++;

    const details = parseBookingDetails(booking.details);
    const previous =
      typeof details.edmInvoice === "object" && details.edmInvoice
        ? details.edmInvoice
        : {};

    let pdfFileName = previous.pdfFileName;
    let pdfError: string | undefined;

    try {
      const ublXml = await readFile(path.join(dir, inv.fileName), "utf8");
      const rendered = await renderInvoicePdfPreferOfficial(
        ublXml,
        renderUblInvoicePdf
      );
      if (rendered.buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
        throw new Error("PDF magic yok");
      }
      const stamp = Date.now();
      pdfFileName = [
        safeFilePart(String(code)),
        safeFilePart(inv.invoiceId),
        safeFilePart(inv.uuid),
        `${stamp}.pdf`,
      ].join("-");
      await writeFile(path.join(outDir, pdfFileName), rendered.buffer);
      summary.pdfOk++;
      console.log(
        `PDF OK ${code} ${inv.invoiceId} ${rendered.source} ${rendered.buffer.length}B`
      );
    } catch (error) {
      summary.pdfFail++;
      pdfError =
        error instanceof Error ? error.message : "PDF üretilemedi";
      console.error(`PDF FAIL ${code} ${inv.invoiceId}:`, pdfError);
    }

    const nextEdm = {
      ...previous,
      status: "SENT",
      uuid: inv.uuid,
      invoiceId: inv.invoiceId,
      eArchive: inv.eArchive,
      profileId: inv.profileId || previous.profileId,
      sentAt: previous.sentAt || `${inv.issueDate}T12:00:00.000Z`,
      updatedAt: new Date().toISOString(),
      pdfFileName: pdfFileName || previous.pdfFileName,
      pdfSavedAt: pdfFileName ? new Date().toISOString() : previous.pdfSavedAt,
    };
    delete (nextEdm as { error?: string }).error;
    if (pdfError) {
      (nextEdm as { pdfError?: string }).pdfError = pdfError;
    } else {
      delete (nextEdm as { pdfError?: string }).pdfError;
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        details: {
          ...details,
          edmInvoice: nextEdm,
        },
      },
    });
    summary.updated++;
  }

  console.log("\n=== ÖZET ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nEşleşmeler:");
  for (const [code, invoices] of [...byRes.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const inv = invoices[invoices.length - 1];
    const found = bookingByCode.has(code) ? "OK" : "YOK";
    console.log(
      `  ${code} -> ${inv.invoiceId} (${inv.uuid.slice(0, 8)}…) [${found}]`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
