import type { AppLocale } from "@/i18n/routing";

export type ContactMessages = {
  title: string;
  helpSupport: string;
  writeUs: string;
  officeMap: string;
  mapMissing: string;
  address: string;
  phone: string;
  phoneMissing: string;
  workingHours: string;
  socialMedia: string;
  formTitle: string;
  formSubtitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneLabel: string;
  message: string;
  kvkkPrefix: string;
  kvkkLink: string;
  kvkkSuffix: string;
  marketingOptIn: string;
  detailsLink: string;
  sending: string;
  send: string;
};

const tr: ContactMessages = {
  title: "İletişim",
  helpSupport: "Yardım / Destek",
  writeUs: "bize yazın",
  officeMap: "Ofis konumu",
  mapMissing: "Harita henüz tanımlanmadı",
  address: "Adres",
  phone: "Telefon",
  phoneMissing: "Telefon tanımlı değil",
  workingHours: "Çalışma Saatlerimiz",
  socialMedia: "Sosyal Medya'da",
  formTitle: "Bizimle iletişime geç!",
  formSubtitle: "Size nasıl yardımcı olabiliriz?",
  firstName: "Adınız*",
  lastName: "Soyadınız*",
  email: "Mail Adresiniz*",
  phoneLabel: "Telefon Numaranız",
  message: "Mesajınız*",
  kvkkPrefix: "",
  kvkkLink: "KVKK Aydınlatma metnini",
  kvkkSuffix: " okudum.*",
  marketingOptIn:
    "{brand} tarafından haber ve kampanyalardan haberdar edilmek istiyorum.",
  detailsLink: "Detaylı Bilgi",
  sending: "Gönderiliyor...",
  send: "GÖNDER",
};

const en: ContactMessages = {
  title: "Contact",
  helpSupport: "Help / Support",
  writeUs: "write to us",
  officeMap: "Office location",
  mapMissing: "Map not set yet",
  address: "Address",
  phone: "Phone",
  phoneMissing: "Phone not set",
  workingHours: "Working Hours",
  socialMedia: "On Social Media",
  formTitle: "Get in touch with us!",
  formSubtitle: "How can we help you?",
  firstName: "First name*",
  lastName: "Last name*",
  email: "Email address*",
  phoneLabel: "Phone number",
  message: "Your message*",
  kvkkPrefix: "I have read the ",
  kvkkLink: "privacy notice",
  kvkkSuffix: ".*",
  marketingOptIn:
    "I would like to receive news and campaigns from {brand}.",
  detailsLink: "More information",
  sending: "Sending...",
  send: "SEND",
};

export const contactMessages: Record<AppLocale, ContactMessages> = {
  tr,
  en,
  de: en,
  fr: en,
  es: en,
  bg: en,
  el: en,
  zh: en,
};
