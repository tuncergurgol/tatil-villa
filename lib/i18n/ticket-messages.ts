import type { AppLocale } from "@/i18n/routing";

export type TicketMessages = {
  searchTitle: string;
  searchDescription: string;
  buyTitle: string;
  buyDescription: string;
  resultTitle: string;
  resultDescription: string;
  stepSearch: string;
  stepBuy: string;
  stepResult: string;
  stepsAria: string;
  backHome: string;
  backHomeCta: string;
  searchCta: string;
  securePayment: string;
  instantETicket: string;
  allOperators: string;
  notConfigured: string;
  iframeSearchTitle: string;
  sessionMissingTitle: string;
  sessionMissingBodyBefore: string;
  sessionMissingPnr: string;
  sessionMissingBodyAfter: string;
  sessionMissingSearchBefore: string;
  sessionMissingSearchLink: string;
  sessionMissingOr: string;
  sessionMissingHomeLink: string;
};

const tr: TicketMessages = {
  searchTitle: "Uçak / Otobüs Bileti Ara",
  searchDescription:
    "Uçak veya otobüs seferlerini arayın, uygun bileti bulun ve güvenle satın alın.",
  buyTitle: "Bilet Satın Al",
  buyDescription: "Seçtiğiniz bileti tamamlayın.",
  resultTitle: "PNR / Sonuç",
  resultDescription:
    "Satın alma sonrası biletinizi görüntüleyin. PNR sorgulamak için bilet arama ekranındaki PNR sekmesini kullanın.",
  stepSearch: "Bilet Ara",
  stepBuy: "Satın Al",
  stepResult: "PNR / Sonuç",
  stepsAria: "Bilet adımları",
  backHome: "← Ana Sayfa",
  backHomeCta: "Ana Sayfaya Dön",
  searchCta: "Bilet Ara",
  securePayment: "Güvenli ödeme",
  instantETicket: "Anında e-bilet",
  allOperators: "Tüm firmalar tek ekranda",
  notConfigured:
    "Bilet arama şu an yapılandırılıyor. Kısa süre içinde tekrar deneyin veya müşteri hizmetlerimizle iletişime geçin.",
  iframeSearchTitle: "Biletall — Bilet Ara",
  sessionMissingTitle: "Bilet oturumu bulunamadı",
  sessionMissingBodyBefore:
    "Bu sayfa satın alma işlemi tamamlandıktan sonra açılır. PNR sorgulamak için bilet arama ekranındaki",
  sessionMissingPnr: "PNR Arama",
  sessionMissingBodyAfter: "sekmesini kullanın.",
  sessionMissingSearchBefore: "Yeni bilet aramak için",
  sessionMissingSearchLink: "bilet arama sayfasına",
  sessionMissingOr: "gidin veya",
  sessionMissingHomeLink: "ana sayfaya dönün",
};

const en: TicketMessages = {
  searchTitle: "Search Flight / Bus Tickets",
  searchDescription:
    "Search flight or bus schedules, find the right ticket and buy securely.",
  buyTitle: "Buy Ticket",
  buyDescription: "Complete your selected ticket purchase.",
  resultTitle: "PNR / Result",
  resultDescription:
    "View your ticket after purchase. Use the PNR tab on the ticket search screen to look up a booking.",
  stepSearch: "Search tickets",
  stepBuy: "Buy",
  stepResult: "PNR / Result",
  stepsAria: "Ticket steps",
  backHome: "← Home",
  backHomeCta: "Back to Home",
  searchCta: "Search tickets",
  securePayment: "Secure payment",
  instantETicket: "Instant e-ticket",
  allOperators: "All operators in one place",
  notConfigured:
    "Ticket search is being configured. Please try again shortly or contact customer service.",
  iframeSearchTitle: "Biletall — Search tickets",
  sessionMissingTitle: "Ticket session not found",
  sessionMissingBodyBefore:
    "This page opens after a purchase is completed. To look up a PNR, use the",
  sessionMissingPnr: "PNR Search",
  sessionMissingBodyAfter: "tab on the ticket search screen.",
  sessionMissingSearchBefore: "To search for a new ticket, go to the",
  sessionMissingSearchLink: "ticket search page",
  sessionMissingOr: "or",
  sessionMissingHomeLink: "return home",
};

export const ticketMessages: Record<AppLocale, TicketMessages> = {
  tr,
  en,
  de: en,
  fr: en,
  es: en,
  bg: en,
  el: en,
  zh: en,
};
