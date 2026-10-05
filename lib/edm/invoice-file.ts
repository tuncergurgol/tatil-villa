import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import {
  withEdmSession,
  type EdmSoapClient,
} from "@/lib/edm/client";
import { renderUblInvoicePdf } from "@/lib/edm/ubl-invoice-pdf";
import { renderInvoicePdfPreferOfficial, extractEmbeddedXslt } from "@/lib/edm/official-invoice-pdf";

const EDM_INVOICE_DIR = path.join(process.cwd(), "storage", "edm-invoices");

/** Eski pdfkit özet PDF ~20–30 KB; GİB XSLT görüntüsü genelde 60 KB+. */
const LEGACY_PLAIN_PDF_MAX_BYTES = 45_000;

/** EDM, GİB XSLT dosyasını faturaya gönderimden kısa süre sonra ekler. */
const XSLT_WAIT_ATTEMPTS = 12;
const XSLT_WAIT_MS = 3_000;

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

export function edmInvoiceAbsolutePath(fileName: string) {
  const base = path.basename(fileName);
  return path.join(EDM_INVOICE_DIR, base);
}

export async function readStoredEdmInvoicePdf(fileName: string) {
  const absolute = edmInvoiceAbsolutePath(fileName);
  await access(absolute);
  const buffer = await readFile(absolute);
  if (buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw new Error("Kayıtlı dosya geçerli PDF değil.");
  }
  return buffer;
}

async function writeEdmInvoicePdf(fileName: string, content: Buffer) {
  await mkdir(EDM_INVOICE_DIR, { recursive: true });
  const absolute = edmInvoiceAbsolutePath(fileName);
  await writeFile(absolute, content);
  return absolute;
}

function resolveDirection(eArchive?: boolean) {
  if (eArchive === true) return "OUT-EARCHIVE" as const;
  if (eArchive === false) return "OUT-EINVOICE" as const;
  return "OUT" as const;
}

async function fetchPdfBuffer(
  client: EdmSoapClient,
  input: { uuid?: string; invoiceId?: string; eArchive?: boolean }
) {
  const uuid = (input.uuid || "").trim();
  const invoiceId = (input.invoiceId || "").trim();
  const gibInvoiceId = /^[A-Z]{3}\d{13}$/i.test(invoiceId) ? invoiceId : "";
  const attempts: Array<"OUT-EARCHIVE" | "OUT-EINVOICE" | "OUT"> = [
    resolveDirection(input.eArchive),
    "OUT",
    "OUT-EARCHIVE",
    "OUT-EINVOICE",
  ];
  const seen = new Set<string>();
  let lastError: Error | null = null;

  for (const direction of attempts) {
    if (seen.has(direction)) continue;
    seen.add(direction);
    try {
      // Canlı EDM hesabı CONTENT_TYPE=PDF verse de UBL XML döndürüyor.
      // XML'i alıp sistemde okunabilir PDF üretiyoruz.
      const result = await client.getInvoice({
        uuid: uuid || undefined,
        invoiceId: uuid ? undefined : gibInvoiceId || undefined,
        direction,
        contentType: "XML",
        headerOnly: false,
      });
      if (!result.content || result.content.length < 20) {
        throw new Error("EDM fatura içeriği boş döndü.");
      }

      const head = result.content.subarray(0, 5).toString("utf8");
      if (result.content.subarray(0, 4).toString("utf8") === "%PDF") {
        return result;
      }
      if (!head.includes("<?xml") && !head.includes("<Invo")) {
        throw new Error("EDM yanıtı beklenen UBL/PDF formatında değil.");
      }

      const xml = result.content.toString("utf8");
      let invoiceXml = xml;
      let latest = result;
      for (let attempt = 0; attempt < XSLT_WAIT_ATTEMPTS; attempt++) {
        if (extractEmbeddedXslt(invoiceXml)) break;
        if (attempt === XSLT_WAIT_ATTEMPTS - 1) break;
        await new Promise((resolve) => setTimeout(resolve, XSLT_WAIT_MS));
        const again = await client.getInvoice({
          uuid: uuid || undefined,
          invoiceId: uuid ? undefined : gibInvoiceId || undefined,
          direction,
          contentType: "XML",
          headerOnly: false,
        });
        if (again.content?.subarray(0, 4).toString("utf8") === "%PDF") {
          return again;
        }
        if (!again.content || again.content.length < 20) continue;
        latest = again;
        invoiceXml = again.content.toString("utf8");
      }
      const rendered = await renderInvoicePdfPreferOfficial(
        invoiceXml,
        renderUblInvoicePdf
      );
      return {
        ...latest,
        contentType: "PDF",
        content: rendered.buffer,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("EDM PDF alınamadı.");
}

export async function downloadAndStoreEdmInvoicePdf(input: {
  bookingId: string;
  reservationNo?: string | number | null;
  uuid?: string;
  invoiceId?: string;
  eArchive?: boolean;
  client?: EdmSoapClient;
}) {
  const uuid = (input.uuid || "").trim();
  const invoiceId = (input.invoiceId || "").trim();
  if (!uuid && !invoiceId) {
    throw new Error("PDF için UUID veya fatura no gerekli.");
  }

  const run = async (client: EdmSoapClient) => {
    const fetched = await fetchPdfBuffer(client, {
      uuid,
      invoiceId,
      eArchive: input.eArchive,
    });
    const resolvedId =
      /^[A-Z]{3}\d{13}$/i.test(fetched.invoiceId || "")
        ? fetched.invoiceId!
        : /^[A-Z]{3}\d{13}$/i.test(invoiceId)
          ? invoiceId
          : fetched.invoiceId || invoiceId || "invoice";
    const stamp = Date.now();
    const fileName = [
      safeFilePart(String(input.reservationNo || input.bookingId)),
      safeFilePart(resolvedId),
      safeFilePart(fetched.uuid || uuid || "uuid"),
      `${stamp}.pdf`,
    ].join("-");

    await writeEdmInvoicePdf(fileName, fetched.content!);
    return {
      fileName,
      invoiceId: resolvedId,
      uuid: fetched.uuid,
      bytes: fetched.content!.length,
    };
  };

  if (input.client) return run(input.client);
  return withEdmSession(run);
}

/** Gönderim sonrası PDF'i kaydeder; başarısız olsa sonucu bozmaz. */
export async function tryPersistEdmInvoicePdfAfterSend(input: {
  bookingId: string;
  reservationNo?: string | number | null;
  uuid?: string;
  invoiceId?: string;
  eArchive?: boolean;
  client: EdmSoapClient;
  details: ReturnType<typeof parseBookingDetails>;
}) {
  try {
    // EDM tarafında görüntünün oluşması için kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const stored = await downloadAndStoreEdmInvoicePdf({
      bookingId: input.bookingId,
      reservationNo: input.reservationNo,
      uuid: input.uuid,
      invoiceId: input.invoiceId,
      eArchive: input.eArchive,
      client: input.client,
    });

    const previous =
      typeof input.details.edmInvoice === "object" && input.details.edmInvoice
        ? input.details.edmInvoice
        : {};
    const prevId = (previous as { invoiceId?: string }).invoiceId || "";
    const keepId =
      /^[A-Z]{3}\d{13}$/i.test(stored.invoiceId || "")
        ? stored.invoiceId
        : /^[A-Z]{3}\d{13}$/i.test(prevId)
          ? prevId
          : stored.invoiceId || prevId;
    const next = {
      ...previous,
      uuid: stored.uuid || (previous as { uuid?: string }).uuid,
      invoiceId: keepId,
      pdfFileName: stored.fileName,
      pdfSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    delete (next as { pdfError?: string }).pdfError;

    await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        details: {
          ...input.details,
          edmInvoice: next,
        },
      },
    });
    return { ok: true as const, fileName: stored.fileName };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EDM PDF kaydedilemedi";
    try {
      const previous =
        typeof input.details.edmInvoice === "object" && input.details.edmInvoice
          ? input.details.edmInvoice
          : {};
      await prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          details: {
            ...input.details,
            edmInvoice: {
              ...previous,
              pdfError: message,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      });
    } catch {
      // yut
    }
    return { ok: false as const, error: message };
  }
}

export async function ensureEdmInvoicePdfForBooking(
  bookingId: string,
  options?: { forceRefresh?: boolean }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, externalCode: true, details: true },
  });
  if (!booking) throw new Error("Rezervasyon bulunamadı.");

  const details = parseBookingDetails(booking.details);
  const edm = details.edmInvoice;
  if (!edm || edm.status !== "SENT") {
    throw new Error("Bu rezervasyon için gönderilmiş EDM faturası yok.");
  }
  if (!edm.uuid && !edm.invoiceId) {
    throw new Error("EDM fatura UUID/no eksik.");
  }

  if (edm.pdfFileName && !options?.forceRefresh) {
    try {
      const buffer = await readStoredEdmInvoicePdf(edm.pdfFileName);
      if (buffer.length >= LEGACY_PLAIN_PDF_MAX_BYTES) {
        return {
          buffer,
          fileName: edm.pdfFileName,
          invoiceId: edm.invoiceId || "",
          downloadName: `edm-fatura-${edm.invoiceId || booking.externalCode || booking.id}.pdf`,
        };
      }
      // Eski düz özet PDF — GİB XSLT ile yeniden üret
    } catch {
      // yeniden çek
    }
  }

  const stored = await downloadAndStoreEdmInvoicePdf({
    bookingId: booking.id,
    reservationNo: booking.externalCode,
    uuid: edm.uuid,
    invoiceId: edm.invoiceId,
    eArchive: edm.eArchive,
  });

  const nextInvoiceId =
    /^[A-Z]{3}\d{13}$/i.test(stored.invoiceId || "")
      ? stored.invoiceId
      : /^[A-Z]{3}\d{13}$/i.test(edm.invoiceId || "")
        ? edm.invoiceId
        : stored.invoiceId || edm.invoiceId;
  const next = {
    ...edm,
    uuid: stored.uuid || edm.uuid,
    invoiceId: nextInvoiceId,
    pdfFileName: stored.fileName,
    pdfSavedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  delete (next as { pdfError?: string }).pdfError;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      details: {
        ...details,
        edmInvoice: next,
      },
    },
  });

  const buffer = await readStoredEdmInvoicePdf(stored.fileName);
  return {
    buffer,
    fileName: stored.fileName,
    invoiceId: stored.invoiceId,
    downloadName: `edm-fatura-${stored.invoiceId || booking.externalCode || booking.id}.pdf`,
  };
}
