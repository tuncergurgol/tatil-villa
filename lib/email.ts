import nodemailer from "nodemailer";
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

export async function sendCompanyMail(
  settings: MailTransportConfig,
  message: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }
) {
  if (!settings.smtpEnabled) {
    throw new Error("SMTP gönderimi devre dışı");
  }

  const transport = createMailTransport(settings);
  const fromName = settings.smtpFromName.trim();
  const fromEmail = settings.smtpFromEmail.trim() || settings.smtpUser.trim();
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  return transport.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
