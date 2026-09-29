import { randomUUID } from "crypto";
import {
  assertEdmConfigured,
  getEdmConfig,
  type EdmConfig,
} from "@/lib/edm/config";
import {
  escapeXml,
  firstXmlAttr,
  firstXmlTagValue,
  soapFaultMessage,
  xmlText,
} from "@/lib/edm/xml";

export type EdmRequestHeader = {
  sessionId: string;
  clientTxnId?: string;
  reason?: string;
};

export type EdmGibUser = {
  identifier: string;
  alias: string;
  title: string;
  type: string;
  unit: string;
  documentType: string;
};

export type EdmSendInvoiceInput = {
  senderVkn: string;
  senderAlias: string;
  receiverVkn: string;
  receiverAlias: string;
  eArchive: boolean;
  invoiceSerial?: string;
  invoiceId?: string;
  uuid: string;
  ublXml: string;
};

export type EdmSendInvoiceResult = {
  uuid: string;
  id: string;
  rawXml: string;
};

/** GİB fatura no: TEA2026000000032 (3 harf + 4 yıl + 9 sıra). */
function isGibInvoiceId(value: string) {
  return /^[A-Z]{3}\d{13}$/i.test(value.trim());
}

function preferGibInvoiceId(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    const v = (c || "").trim();
    if (isGibInvoiceId(v)) return v;
  }
  for (const c of candidates) {
    const v = (c || "").trim();
    if (v && v !== "0") return v;
  }
  return "";
}

function extractGibInvoiceIdFromContent(content: Buffer | null): string {
  if (!content || content.length < 20) return "";
  if (content.subarray(0, 4).toString("utf8") === "%PDF") return "";
  const text = content.toString("utf8");
  const match = text.match(
    /<(?:[\w]+:)?ID\b[^>]*>([A-Z]{3}\d{13})<\/(?:[\w]+:)?ID>/i
  );
  return match?.[1] || "";
}

function formatActionDate(date = new Date()) {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${sign}${oh}:${om}`;
}

function buildRequestHeaderXml(
  config: EdmConfig,
  header: EdmRequestHeader
): string {
  return [
    `<REQUEST_HEADER xmlns="">`,
    xmlText("SESSION_ID", header.sessionId),
    xmlText("CLIENT_TXN_ID", header.clientTxnId || randomUUID()),
    xmlText("ACTION_DATE", formatActionDate()),
    xmlText("REASON", header.reason || "Tatildeyiz e-fatura entegrasyonu"),
    xmlText("APPLICATION_NAME", config.applicationName),
    xmlText("HOSTNAME", config.hostname),
    xmlText("CHANNEL_NAME", config.channelName),
    xmlText("COMPRESSED", "N"),
    `</REQUEST_HEADER>`,
  ].join("");
}

function wrapSoap(bodyInner: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">` +
    bodyInner +
    `</s:Body></s:Envelope>`;
}

export class EdmSoapClient {
  readonly config: EdmConfig;
  private sessionId: string | null = null;

  constructor(config: EdmConfig = getEdmConfig()) {
    this.config = assertEdmConfigured(config);
  }

  getSessionId() {
    return this.sessionId;
  }

  private async call(soapAction: string, bodyInner: string): Promise<string> {
    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: soapAction,
      },
      body: wrapSoap(bodyInner),
      cache: "no-store",
    });

    const xml = await response.text();
    const fault = soapFaultMessage(xml);
    if (!response.ok || fault) {
      throw new Error(
        fault || `EDM SOAP hata (HTTP ${response.status}): ${xml.slice(0, 400)}`
      );
    }
    return xml;
  }

  async login(): Promise<string> {
    const body =
      `<LoginRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, { sessionId: "0" }) +
      xmlText("USER_NAME", this.config.username, true) +
      xmlText("PASSWORD", this.config.password, true) +
      `</LoginRequest>`;

    const xml = await this.call("LoginRequest", body);
    const sessionId = firstXmlTagValue(xml, "SESSION_ID");
    if (!sessionId) {
      throw new Error("EDM Login: SESSION_ID alınamadı.");
    }
    this.sessionId = sessionId;
    return sessionId;
  }

  async logout(): Promise<void> {
    if (!this.sessionId) return;
    const body =
      `<LogoutRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, { sessionId: this.sessionId }) +
      `</LogoutRequest>`;
    try {
      await this.call("LogoutRequest", body);
    } finally {
      this.sessionId = null;
    }
  }

  private requireSession(): string {
    if (!this.sessionId) {
      throw new Error("EDM oturumu yok; önce login çağırın.");
    }
    return this.sessionId;
  }

  async checkCounter(): Promise<number | null> {
    const body =
      `<CheckCounterRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
      }) +
      `</CheckCounterRequest>`;
    const xml = await this.call("CheckCounterRequest", body);
    const left = firstXmlTagValue(xml, "COUNTER_LEFT");
    if (left == null || left === "") return null;
    const n = Number(left);
    return Number.isFinite(n) ? n : null;
  }

  async checkUser(identifier: string): Promise<EdmGibUser[]> {
    const digits = identifier.replace(/\D/g, "");
    const body =
      `<CheckUserRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
      }) +
      `<USER xmlns="">` +
      xmlText("IDENTIFIER", digits) +
      `</USER>` +
      `</CheckUserRequest>`;

    const xml = await this.call("CheckUserRequest", body);
    const users: EdmGibUser[] = [];
    const userBlocks = xml.match(/<USER\b[\s\S]*?<\/USER>/gi) || [];
    for (const block of userBlocks) {
      users.push({
        identifier: firstXmlTagValue(block, "IDENTIFIER") || digits,
        alias: firstXmlTagValue(block, "ALIAS") || "",
        title: firstXmlTagValue(block, "TITLE") || "",
        type: firstXmlTagValue(block, "TYPE") || "",
        unit: firstXmlTagValue(block, "UNIT") || "",
        documentType: firstXmlTagValue(block, "DOCUMENTTYPE") || "",
      });
    }
    return users;
  }

  async sendInvoice(input: EdmSendInvoiceInput): Promise<EdmSendInvoiceResult> {
    const contentB64 = Buffer.from(input.ublXml, "utf8").toString("base64");
    const today = new Date().toISOString().slice(0, 10);
    const serialXml = input.invoiceSerial
      ? xmlText("INVOICESERIAL_REQUESTED", input.invoiceSerial)
      : `<INVOICESERIAL_REQUESTED/>`;

    const invoiceXml =
      `<INVOICE xmlns="" TRXID="0" UUID="${escapeXml(input.uuid)}" ID="${escapeXml(input.invoiceId || "")}">` +
      `<HEADER>` +
      `<INTERNETSALES>false</INTERNETSALES>` +
      `<EARCHIVE>${input.eArchive ? "true" : "false"}</EARCHIVE>` +
      serialXml +
      xmlText("EARCHIVE_REPORT_SENDDATE", today) +
      `</HEADER>` +
      `<CONTENT>${contentB64}</CONTENT>` +
      `</INVOICE>`;

    const body =
      `<SendInvoiceRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
        reason: "Komisyon e-fatura/e-arsiv gönderimi",
      }) +
      `<SENDER xmlns="" vkn="${escapeXml(input.senderVkn)}" alias="${escapeXml(input.senderAlias)}"/>` +
      `<RECEIVER xmlns="" vkn="${escapeXml(input.receiverVkn)}" alias="${escapeXml(input.receiverAlias)}"/>` +
      invoiceXml +
      `</SendInvoiceRequest>`;

    const xml = await this.call("SendInvoiceRequest", body);
    const uuid =
      firstXmlAttr(xml, "INVOICE", "UUID") ||
      firstXmlTagValue(xml, "UUID") ||
      input.uuid;
    const id = firstXmlAttr(xml, "INVOICE", "ID") || firstXmlTagValue(xml, "ID") || "";

    return { uuid, id, rawXml: xml };
  }

  async getInvoiceSerials(): Promise<
    Array<{
      code: string;
      year: number;
      lastSerialUsed: number;
      sendType: string;
    }>
  > {
    const body =
      `<GetInvoiceSerialRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
      }) +
      `</GetInvoiceSerialRequest>`;
    const xml = await this.call("GetInvoiceSerialRequest", body);
    const items =
      xml.match(/<Items\b[^>]*>[\s\S]*?<\/Items>/gi)?.filter((block) =>
        /INVOICESERIALCODE/i.test(block)
      ) || [];
    return items.map((block) => ({
      code: firstXmlTagValue(block, "INVOICESERIALCODE") || "",
      year: Number(firstXmlTagValue(block, "YEAR") || "0"),
      lastSerialUsed: Number(firstXmlTagValue(block, "LASTSERIALUSED") || "0"),
      sendType:
        firstXmlTagValue(block, "INVOİCESENDTYPE") ||
        firstXmlTagValue(block, "INVOICESENDTYPE") ||
        "",
    }));
  }

  /** GİB formatı: AAAYYYY######### (3 harf + yıl + 9 hane) */
  async allocateInvoiceId(preferredSerial?: string, eArchive = true): Promise<{
    invoiceId: string;
    serial: string;
  }> {
    const serials = await this.getInvoiceSerials();
    const year = new Date().getFullYear();
    const preferred = (preferredSerial || "").trim().toUpperCase();
    const typeHint = eArchive ? /e-?\s*ar[sş]iv|internet/i : /e-?\s*fatura/i;

    let chosen =
      (preferred
        ? serials.find((s) => s.code.toUpperCase() === preferred && s.year === year)
        : undefined) ||
      serials.find(
        (s) => s.year === year && typeHint.test(s.sendType) && s.code
      ) ||
      serials.find((s) => s.year === year && s.code) ||
      serials.find((s) => s.code);

    if (!chosen?.code) {
      const fallbackSerial = preferred || "SYA";
      return {
        serial: fallbackSerial,
        invoiceId: `${fallbackSerial}${year}${"1".padStart(9, "0")}`,
      };
    }

    const next = Math.max(1, (chosen.lastSerialUsed || 0) + 1);
    return {
      serial: chosen.code,
      invoiceId: `${chosen.code}${chosen.year || year}${String(next).padStart(9, "0")}`,
    };
  }

  async getInvoice(input: {
    uuid?: string;
    invoiceId?: string;
    direction?: "OUT" | "IN" | "OUT-EINVOICE" | "OUT-EARCHIVE";
    contentType?: "PDF" | "XML" | "HTML" | "ALL";
    headerOnly?: boolean;
  }): Promise<{
    uuid: string;
    invoiceId: string;
    contentType: string;
    content: Buffer | null;
    rawXml: string;
  }> {
    const uuid = (input.uuid || "").trim();
    const invoiceId = (input.invoiceId || "").trim();
    if (!uuid && !invoiceId) {
      throw new Error("GetInvoice için UUID veya fatura no gerekli.");
    }

    const contentType = input.contentType || "PDF";
    const direction = input.direction || "OUT";
    // GİB fatura no: TEA2026000000032 gibi 3 harf + yıl + 9 hane.
    // EDM iç id (1188065758) ile arama boş döner; UUID varken onu kullan.
    const gibInvoiceId = /^[A-Z]{3}\d{13}$/i.test(invoiceId) ? invoiceId : "";
    const searchParts = [
      xmlText("LIMIT", "1"),
      uuid ? xmlText("UUID", uuid) : "",
      !uuid && gibInvoiceId ? xmlText("ID", gibInvoiceId) : "",
      xmlText("DIRECTION", direction),
      xmlText("READ_INCLUDED", "true"),
    ].filter(Boolean);

    const body =
      `<GetInvoiceRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
        reason: "Fatura PDF/XML indirme",
      }) +
      `<INVOICE_SEARCH_KEY xmlns="">${searchParts.join("")}</INVOICE_SEARCH_KEY>` +
      xmlText("HEADER_ONLY", input.headerOnly ? "Y" : "N") +
      xmlText("INVOICE_CONTENT_TYPE", contentType) +
      `</GetInvoiceRequest>`;

    const xml = await this.call("GetInvoiceRequest", body);
    const invoiceBlock =
      (xml.match(/<INVOICE\b[\s\S]*?<\/INVOICE>/i) || [])[0] || "";
    if (!invoiceBlock) {
      throw new Error("GetInvoice: fatura bulunamadı.");
    }

    const contentMatch = invoiceBlock.match(
      /<CONTENT\b[^>]*>([\s\S]*?)<\/CONTENT>/i
    );
    const contentRaw = contentMatch?.[1]?.trim() || "";
    let content: Buffer | null = null;
    if (contentRaw) {
      const cleaned = contentRaw
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/\s+/g, "");
      content = Buffer.from(cleaned, "base64");
    }

    // EDM SOAP INVOICE@ID çoğu zaman "0"/TRXID; gerçek GİB no UBL içindeki cbc:ID.
    return {
      uuid:
        firstXmlAttr(invoiceBlock, "INVOICE", "UUID") ||
        firstXmlTagValue(invoiceBlock, "UUID") ||
        uuid,
      invoiceId: preferGibInvoiceId(
        extractGibInvoiceIdFromContent(content),
        firstXmlAttr(invoiceBlock, "INVOICE", "ID"),
        firstXmlTagValue(invoiceBlock, "ID"),
        gibInvoiceId,
        invoiceId
      ),
      contentType,
      content,
      rawXml: xml,
    };
  }

  async getInvoiceStatus(uuid: string): Promise<{
    status: string;
    statusDescription: string;
    gibStatusCode: string;
    gibStatusDescription: string;
    rawXml: string;
  }> {
    const body =
      `<GetInvoiceStatusRequest xmlns="http://tempuri.org/">` +
      buildRequestHeaderXml(this.config, {
        sessionId: this.requireSession(),
      }) +
      `<INVOICE TRXID="0" UUID="${escapeXml(uuid)}" xmlns=""/>` +
      `</GetInvoiceStatusRequest>`;

    const xml = await this.call("GetInvoiceStatusRequest", body);
    return {
      status: firstXmlTagValue(xml, "STATUS") || "",
      statusDescription: firstXmlTagValue(xml, "STATUS_DESCRIPTION") || "",
      gibStatusCode: firstXmlTagValue(xml, "GIB_STATUS_CODE") || "",
      gibStatusDescription: firstXmlTagValue(xml, "GIB_STATUS_DESCRIPTION") || "",
      rawXml: xml,
    };
  }
}

export async function withEdmSession<T>(
  fn: (client: EdmSoapClient) => Promise<T>,
  config?: EdmConfig
): Promise<T> {
  const client = new EdmSoapClient(config);
  await client.login();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // logout başarısız olsa da asıl sonucu bozma
    }
  }
}
