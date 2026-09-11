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
  uuid: string;
  ublXml: string;
};

export type EdmSendInvoiceResult = {
  uuid: string;
  id: string;
  rawXml: string;
};

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
      `<INVOICE xmlns="" TRXID="0" UUID="${escapeXml(input.uuid)}">` +
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
