"use server";

import { z } from "zod";
import { sendCompanyMail } from "@/lib/email";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type ContactActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

const contactSchema = z.object({
  firstName: z.string().trim().min(2, "Ad gerekli"),
  lastName: z.string().trim().min(2, "Soyad gerekli"),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, "Mesaj en az 10 karakter olmalı"),
  kvkkAccepted: z.boolean(),
  marketingOptIn: z.boolean().optional(),
});

export async function sendContactMessageAction(
  _prev: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    message: formData.get("message"),
    kvkkAccepted: formData.get("kvkkAccepted") === "on",
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  if (!parsed.data.kvkkAccepted) {
    return { error: "KVKK metnini onaylamanız gerekir" };
  }

  const company = await getCompanySettings();
  const to = company.email?.trim();
  if (!to) {
    return { error: "İletişim e-posta adresi tanımlı değil" };
  }

  const { firstName, lastName, email, phone, message, marketingOptIn } =
    parsed.data;
  const fullName = `${firstName} ${lastName}`;

  const text = [
    `İletişim formu mesajı`,
    ``,
    `Ad Soyad: ${fullName}`,
    `E-posta: ${email}`,
    `Telefon: ${phone || "-"}`,
    `Kampanya bilgilendirmesi: ${marketingOptIn ? "Evet" : "Hayır"}`,
    ``,
    `Mesaj:`,
    message,
  ].join("\n");

  try {
    await sendCompanyMail(company, {
      to,
      subject: `İletişim formu — ${fullName}`,
      text,
      html: `
        <h2>İletişim formu mesajı</h2>
        <p><strong>Ad Soyad:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(phone || "-")}</p>
        <p><strong>Kampanya bilgilendirmesi:</strong> ${marketingOptIn ? "Evet" : "Hayır"}</p>
        <p><strong>Mesaj:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `,
    });
    return {
      success: true,
      message: "Mesajınız iletildi. En kısa sürede dönüş yapacağız.",
    };
  } catch (error) {
    console.error("sendContactMessageAction", error);
    const reason =
      error instanceof Error && error.message.includes("SMTP")
        ? "E-posta gönderimi şu an kullanılamıyor. Lütfen telefonla ulaşın."
        : "Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.";
    return { error: reason };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
