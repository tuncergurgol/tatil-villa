import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import type { CompanySettings } from "@prisma/client";

export type MailTransportConfig = Pick<
  CompanySettings,
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "smtpUser"
  | "smtpPassword"
  | "smtpFromEmail"
  | "smtpFromName"
  | "smtpEnabled"
>;

/** rezervasyon@ adresinden giden maillerin gizli kopyası */
const RESERVATION_MAIL_BCC = "info@tatildeyiz.com.tr";
const RESERVATION_FROM_EMAIL = "rezervasyon@tatildeyiz.com.tr";

export function createMailTransport(settings: MailTransportConfig) {
  const secure = settings.smtpSecure === "ssl";

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
    ...(settings.smtpSecure === "starttls"
      ? { requireTLS: true, tls: { minVersion: "TLSv1.2" } }
      : {}),
  });
}

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function resolveReservationBcc(fromEmail: string, to: string): string | undefined {
  if (normalizeEmail(fromEmail) !== RESERVATION_FROM_EMAIL) {
    return undefined;
  }
  // Alıcı zaten info ise BCC ekleme
  if (normalizeEmail(to) === normalizeEmail(RESERVATION_MAIL_BCC)) {
    return undefined;
  }
  return RESERVATION_MAIL_BCC;
}

export async function sendCompanyMail(
  settings: MailTransportConfig,
  message: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    bcc?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    attachments?: Attachment[];
  }
) {
  if (!settings.smtpEnabled) {
    throw new Error("SMTP gönderimi devre dışı");
  }

  const transport = createMailTransport(settings);
  const fromName = message.fromName?.trim() || settings.smtpFromName.trim();
  const fromEmail =
    message.fromEmail?.trim() ||
    settings.smtpFromEmail.trim() ||
    settings.smtpUser.trim();
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  // bcc verilmişse (boş string dahil) otomatik rezervasyon BCC uygulanmaz
  const bcc =
    message.bcc !== undefined
      ? message.bcc.trim() || undefined
      : resolveReservationBcc(fromEmail, message.to);

  return transport.sendMail({
    from,
    to: message.to,
    ...(message.replyTo?.trim() ? { replyTo: message.replyTo.trim() } : {}),
    ...(bcc ? { bcc } : {}),
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.attachments?.length
      ? { attachments: message.attachments }
      : {}),
  });
}
