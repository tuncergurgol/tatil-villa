export function extractEmbeddedXslt(ublXml: string): string | null {
  const re =
    /<(?:[\w]+:)?EmbeddedDocumentBinaryObject\b([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?EmbeddedDocumentBinaryObject>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(ublXml))) {
    const b64 = match[2].replace(/\s+/g, "");
    if (!b64) continue;
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    if (
      /<xsl:stylesheet[\s>]/i.test(decoded) ||
      /<stylesheet[\s>]/i.test(decoded)
    ) {
      return decoded;
    }
  }
  return null;
}

/**
 * UBL + gömülü GİB XSLT → resmi fatura görüntüsü PDF (Playwright).
 */
export async function renderOfficialInvoicePdfFromUbl(
  ublXml: string
): Promise<Buffer> {
  const xslt = extractEmbeddedXslt(ublXml);
  if (!xslt) {
    throw new Error("UBL içinde GİB XSLT görüntüsü bulunamadı.");
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    const html = await page.evaluate(
      ({ xmlText, xsltText }) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const xsltDoc = parser.parseFromString(xsltText, "text/xml");
        const xmlErr = xmlDoc.querySelector("parsererror");
        const xsltErr = xsltDoc.querySelector("parsererror");
        if (xmlErr || xsltErr) {
          throw new Error(
            `XSLT/XML parse hatası: ${(xmlErr || xsltErr)?.textContent || ""}`
          );
        }
        const processor = new XSLTProcessor();
        processor.importStylesheet(xsltDoc);
        const fragment = processor.transformToFragment(xmlDoc, document);
        const wrapper = document.createElement("div");
        wrapper.appendChild(fragment);
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          html,body{margin:0;padding:0;background:#fff}
          @page{margin:10mm}
        </style></head><body>${wrapper.innerHTML}</body></html>`;
      },
      { xmlText: ublXml, xsltText: xslt }
    );

    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function renderInvoicePdfPreferOfficial(
  ublXml: string,
  fallback: (xml: string) => Promise<Buffer>
): Promise<{ buffer: Buffer; source: "gib-xslt" | "fallback" }> {
  try {
    const buffer = await renderOfficialInvoicePdfFromUbl(ublXml);
    if (buffer.subarray(0, 4).toString("utf8") === "%PDF") {
      return { buffer, source: "gib-xslt" };
    }
  } catch (error) {
    console.warn(
      "[edm] GİB XSLT PDF üretilemedi, düz UBL fallback kullanılıyor:",
      error instanceof Error ? error.message : error
    );
  }
  return { buffer: await fallback(ublXml), source: "fallback" };
}
