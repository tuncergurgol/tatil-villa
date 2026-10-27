import type { AppLocale } from "@/i18n/routing";
import {
  chromeMessages,
  type ChromeMessages,
} from "@/lib/i18n/chrome-messages";
import {
  footerExtraMessages,
  homeExtraMessages,
  searchMessages,
  servicesMessages,
  type FooterExtraMessages,
  type HomeExtraMessages,
  type SearchMessages,
  type ServicesMessages,
} from "@/lib/i18n/search-messages";
import {
  villaDetailMessages,
  type VillaDetailMessages,
} from "@/lib/i18n/villa-detail-messages";
import {
  contactMessages,
  type ContactMessages,
} from "@/lib/i18n/contact-messages";
import {
  ticketMessages,
  type TicketMessages,
} from "@/lib/i18n/ticket-messages";
import {
  villaSearchMessages,
  type VillaSearchMessages,
} from "@/lib/i18n/villa-search-messages";

export type AppMessages = {
  nav: {
    villas: string;
    deals: string;
    regions: string;
    campaigns: string;
    loyalty: string;
    allVillas: string;
    dealVillas: string;
    popularRegions: string;
    services: string;
    reservationVerify: string;
  };
  header: {
    memberLogin: string;
    searchVilla: string;
    menu: string;
    language: string;
    selectLanguage: string;
  };
  footer: {
    quickLinks: string;
    corporate: string;
    popularRegions: string;
    neighborhoods: string;
    contact: string;
    workingHours: string;
    allRightsReserved: string;
    verifyTursab: string;
  } & FooterExtraMessages;
  mobileNav: {
    home: string;
    search: string;
    reservation: string;
    callUs: string;
    weWillCallYou: string;
    whatsapp: string;
  };
  common: {
    search: string;
    close: string;
    loading: string;
    night: string;
    nights: string;
    guest: string;
    guests: string;
    from: string;
    perNight: string;
    checkIn: string;
    checkOut: string;
    available: string;
    booked: string;
    option: string;
    checkout: string;
    checkin: string;
    lastMinute: string;
  };
  villa: VillaDetailMessages;
  home: {
    heroAlt: string;
    searchTitle: string;
  } & HomeExtraMessages;
  booking: {
    preReservation: string;
    sendRequest: string;
    checkInDate: string;
    checkOutDate: string;
    adults: string;
  };
  search: SearchMessages;
  services: ServicesMessages;
  chrome: ChromeMessages;
  contact: ContactMessages;
  ticket: TicketMessages;
  villaSearch: VillaSearchMessages;
};

type CoreMessages = {
  nav: AppMessages["nav"];
  header: AppMessages["header"];
  footer: Omit<AppMessages["footer"], keyof FooterExtraMessages>;
  mobileNav: AppMessages["mobileNav"];
  common: AppMessages["common"];
  villa: AppMessages["villa"];
  home: Omit<AppMessages["home"], keyof HomeExtraMessages>;
  booking: AppMessages["booking"];
};

function withCatalog(locale: AppLocale, core: CoreMessages): AppMessages {
  return {
    ...core,
    footer: { ...core.footer, ...footerExtraMessages[locale] },
    home: { ...core.home, ...homeExtraMessages[locale] },
    search: searchMessages[locale],
    services: servicesMessages[locale],
    chrome: chromeMessages[locale],
    contact: contactMessages[locale],
    ticket: ticketMessages[locale],
    villaSearch: villaSearchMessages[locale],
  };
}

const trCore: CoreMessages = {
  nav: {
    villas: "Villalar",
    deals: "Fırsatlar",
    regions: "Bölgeler",
    campaigns: "Kampanyalar",
    loyalty: "Sadakat Programı",
    allVillas: "Tüm Villalar",
    dealVillas: "Fırsat Villalar",
    popularRegions: "Popüler Bölgeler",
    services: "Hizmetler",
    reservationVerify: "Rezervasyon Doğrulama",
  },
  header: {
    memberLogin: "Üye Girişi",
    searchVilla: "Villa Ara",
    menu: "Menü",
    language: "Dil",
    selectLanguage: "Dil Seçin",
  },
  footer: {
    quickLinks: "Hızlı Bağlantılar",
    corporate: "Kurumsal",
    popularRegions: "Popüler Bölgeler",
    neighborhoods: "Mahalleler",
    contact: "İletişim",
    workingHours: "Çalışma Saatleri",
    allRightsReserved: "Tüm hakları saklıdır.",
    verifyTursab: "TÜRSAB Dijital Doğrulama",
  },
  mobileNav: {
    home: "Ana Sayfa",
    search: "Villa Ara",
    reservation: "Rezervasyon",
    callUs: "Bizi Arayın",
    weWillCallYou: "Sizi Arayalım",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Ara",
    close: "Kapat",
    loading: "Yükleniyor…",
    night: "Gece",
    nights: "Gece",
    guest: "Kişi",
    guests: "Kişi",
    from: "den başlayan",
    perNight: "gecelik",
    checkIn: "Giriş",
    checkOut: "Çıkış",
    available: "Müsait",
    booked: "Dolu",
    option: "Opsiyonda",
    checkout: "Çıkış",
    checkin: "Giriş",
    lastMinute: "Son Dakika Fırsatı",
  },
  villa: villaDetailMessages.tr,
  home: {
    heroAlt: "Tatil manzarası",
    searchTitle: "Hayalinizdeki villayı bulun",
  },
  booking: {
    preReservation: "Ön Rezervasyon Talebi Gönder",
    sendRequest: "Talep Gönder",
    checkInDate: "Giriş Tarihi",
    checkOutDate: "Çıkış Tarihi",
    adults: "Yetişkin",
  },
};

const enCore: CoreMessages = {
  nav: {
    villas: "Villas",
    deals: "Deals",
    regions: "Regions",
    campaigns: "Campaigns",
    loyalty: "Loyalty Program",
    allVillas: "All Villas",
    dealVillas: "Deal Villas",
    popularRegions: "Popular Regions",
    services: "Services",
    reservationVerify: "Reservation Verification",
  },
  header: {
    memberLogin: "Member Login",
    searchVilla: "Search Villa",
    menu: "Menu",
    language: "Language",
    selectLanguage: "Select Language",
  },
  footer: {
    quickLinks: "Quick Links",
    corporate: "Corporate",
    popularRegions: "Popular Regions",
    neighborhoods: "Neighborhoods",
    contact: "Contact",
    workingHours: "Working Hours",
    allRightsReserved: "All rights reserved.",
    verifyTursab: "TÜRSAB Digital Verification",
  },
  mobileNav: {
    home: "Home",
    search: "Search Villa",
    reservation: "Reservation",
    callUs: "Call Us",
    weWillCallYou: "We'll Call You",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Search",
    close: "Close",
    loading: "Loading…",
    night: "Night",
    nights: "Nights",
    guest: "Guest",
    guests: "Guests",
    from: "from",
    perNight: "per night",
    checkIn: "Check-in",
    checkOut: "Check-out",
    available: "Available",
    booked: "Booked",
    option: "On option",
    checkout: "Check-out",
    checkin: "Check-in",
    lastMinute: "Last Minute Deal",
  },
  villa: villaDetailMessages.en,
  home: {
    heroAlt: "Holiday scenery",
    searchTitle: "Find your dream villa",
  },
  booking: {
    preReservation: "Send Pre-Reservation Request",
    sendRequest: "Send Request",
    checkInDate: "Check-in Date",
    checkOutDate: "Check-out Date",
    adults: "Adults",
  },
};

const deCore: CoreMessages = {
  nav: {
    villas: "Villen",
    deals: "Angebote",
    regions: "Regionen",
    campaigns: "Kampagnen",
    loyalty: "Treueprogramm",
    allVillas: "Alle Villen",
    dealVillas: "Angebotsvillen",
    popularRegions: "Beliebte Regionen",
    services: "Dienstleistungen",
    reservationVerify: "Reservierungsprüfung",
  },
  header: {
    memberLogin: "Mitgliederlogin",
    searchVilla: "Villa suchen",
    menu: "Menü",
    language: "Sprache",
    selectLanguage: "Sprache wählen",
  },
  footer: {
    quickLinks: "Schnelllinks",
    corporate: "Unternehmen",
    popularRegions: "Beliebte Regionen",
    neighborhoods: "Stadtteile",
    contact: "Kontakt",
    workingHours: "Öffnungszeiten",
    allRightsReserved: "Alle Rechte vorbehalten.",
    verifyTursab: "TÜRSAB digitale Verifizierung",
  },
  mobileNav: {
    home: "Startseite",
    search: "Villa suchen",
    reservation: "Reservierung",
    callUs: "Rufen Sie uns an",
    weWillCallYou: "Wir rufen Sie an",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Suchen",
    close: "Schließen",
    loading: "Wird geladen…",
    night: "Nacht",
    nights: "Nächte",
    guest: "Gast",
    guests: "Gäste",
    from: "ab",
    perNight: "pro Nacht",
    checkIn: "Anreise",
    checkOut: "Abreise",
    available: "Verfügbar",
    booked: "Belegt",
    option: "Option",
    checkout: "Abreise",
    checkin: "Anreise",
    lastMinute: "Last-Minute-Angebot",
  },
  villa: villaDetailMessages.de,
  home: {
    heroAlt: "Urlaubslandschaft",
    searchTitle: "Finden Sie Ihre Traumvilla",
  },
  booking: {
    preReservation: "Vorreservierungsanfrage senden",
    sendRequest: "Anfrage senden",
    checkInDate: "Anreisedatum",
    checkOutDate: "Abreisedatum",
    adults: "Erwachsene",
  },
};

const frCore: CoreMessages = {
  nav: {
    villas: "Villas",
    deals: "Offres",
    regions: "Régions",
    campaigns: "Campagnes",
    loyalty: "Programme de fidélité",
    allVillas: "Toutes les villas",
    dealVillas: "Villas en promotion",
    popularRegions: "Régions populaires",
    services: "Services",
    reservationVerify: "Vérification de réservation",
  },
  header: {
    memberLogin: "Connexion membre",
    searchVilla: "Rechercher une villa",
    menu: "Menu",
    language: "Langue",
    selectLanguage: "Choisir la langue",
  },
  footer: {
    quickLinks: "Liens rapides",
    corporate: "Entreprise",
    popularRegions: "Régions populaires",
    neighborhoods: "Quartiers",
    contact: "Contact",
    workingHours: "Heures d'ouverture",
    allRightsReserved: "Tous droits réservés.",
    verifyTursab: "Vérification numérique TÜRSAB",
  },
  mobileNav: {
    home: "Accueil",
    search: "Rechercher",
    reservation: "Réservation",
    callUs: "Appelez-nous",
    weWillCallYou: "On vous rappelle",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Rechercher",
    close: "Fermer",
    loading: "Chargement…",
    night: "Nuit",
    nights: "Nuits",
    guest: "Voyageur",
    guests: "Voyageurs",
    from: "à partir de",
    perNight: "par nuit",
    checkIn: "Arrivée",
    checkOut: "Départ",
    available: "Disponible",
    booked: "Complet",
    option: "Option",
    checkout: "Départ",
    checkin: "Arrivée",
    lastMinute: "Offre de dernière minute",
  },
  villa: villaDetailMessages.fr,
  home: {
    heroAlt: "Paysage de vacances",
    searchTitle: "Trouvez la villa de vos rêves",
  },
  booking: {
    preReservation: "Envoyer une demande de pré-réservation",
    sendRequest: "Envoyer la demande",
    checkInDate: "Date d'arrivée",
    checkOutDate: "Date de départ",
    adults: "Adultes",
  },
};

const esCore: CoreMessages = {
  nav: {
    villas: "Villas",
    deals: "Ofertas",
    regions: "Regiones",
    campaigns: "Campañas",
    loyalty: "Programa de fidelidad",
    allVillas: "Todas las villas",
    dealVillas: "Villas en oferta",
    popularRegions: "Regiones populares",
    services: "Servicios",
    reservationVerify: "Verificación de reserva",
  },
  header: {
    memberLogin: "Acceso de miembros",
    searchVilla: "Buscar villa",
    menu: "Menú",
    language: "Idioma",
    selectLanguage: "Seleccionar idioma",
  },
  footer: {
    quickLinks: "Enlaces rápidos",
    corporate: "Corporativo",
    popularRegions: "Regiones populares",
    neighborhoods: "Barrios",
    contact: "Contacto",
    workingHours: "Horario",
    allRightsReserved: "Todos los derechos reservados.",
    verifyTursab: "Verificación digital TÜRSAB",
  },
  mobileNav: {
    home: "Inicio",
    search: "Buscar villa",
    reservation: "Reserva",
    callUs: "Llámenos",
    weWillCallYou: "Le llamamos",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Buscar",
    close: "Cerrar",
    loading: "Cargando…",
    night: "Noche",
    nights: "Noches",
    guest: "Huésped",
    guests: "Huéspedes",
    from: "desde",
    perNight: "por noche",
    checkIn: "Entrada",
    checkOut: "Salida",
    available: "Disponible",
    booked: "Ocupado",
    option: "Opción",
    checkout: "Salida",
    checkin: "Entrada",
    lastMinute: "Oferta de última hora",
  },
  villa: villaDetailMessages.es,
  home: {
    heroAlt: "Paisaje vacacional",
    searchTitle: "Encuentra la villa de tus sueños",
  },
  booking: {
    preReservation: "Enviar solicitud de pre-reserva",
    sendRequest: "Enviar solicitud",
    checkInDate: "Fecha de entrada",
    checkOutDate: "Fecha de salida",
    adults: "Adultos",
  },
};

const bgCore: CoreMessages = {
  nav: {
    villas: "Вили",
    deals: "Оферти",
    regions: "Региони",
    campaigns: "Кампании",
    loyalty: "Програма за лоялност",
    allVillas: "Всички вили",
    dealVillas: "Вили на промоция",
    popularRegions: "Популярни региони",
    services: "Услуги",
    reservationVerify: "Проверка на резервация",
  },
  header: {
    memberLogin: "Вход за членове",
    searchVilla: "Търсене на вила",
    menu: "Меню",
    language: "Език",
    selectLanguage: "Изберете език",
  },
  footer: {
    quickLinks: "Бързи връзки",
    corporate: "Корпоративно",
    popularRegions: "Популярни региони",
    neighborhoods: "Квартали",
    contact: "Контакт",
    workingHours: "Работно време",
    allRightsReserved: "Всички права запазени.",
    verifyTursab: "TÜRSAB цифрова верификация",
  },
  mobileNav: {
    home: "Начало",
    search: "Търсене",
    reservation: "Резервация",
    callUs: "Обадете се",
    weWillCallYou: "Ще ви се обадим",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Търсене",
    close: "Затвори",
    loading: "Зареждане…",
    night: "Нощ",
    nights: "Нощи",
    guest: "Гост",
    guests: "Гости",
    from: "от",
    perNight: "на нощ",
    checkIn: "Настаняване",
    checkOut: "Напускане",
    available: "Свободно",
    booked: "Заето",
    option: "Опция",
    checkout: "Напускане",
    checkin: "Настаняване",
    lastMinute: "Оферта в последния момент",
  },
  villa: villaDetailMessages.bg,
  home: {
    heroAlt: "Ваканционен пейзаж",
    searchTitle: "Намерете вилата на мечтите си",
  },
  booking: {
    preReservation: "Изпратете заявка за предварителна резервация",
    sendRequest: "Изпрати заявка",
    checkInDate: "Дата на настаняване",
    checkOutDate: "Дата на напускане",
    adults: "Възрастни",
  },
};

const elCore: CoreMessages = {
  nav: {
    villas: "Βίλες",
    deals: "Προσφορές",
    regions: "Περιοχές",
    campaigns: "Καμπάνιες",
    loyalty: "Πρόγραμμα επιβράβευσης",
    allVillas: "Όλες οι βίλες",
    dealVillas: "Βίλες προσφοράς",
    popularRegions: "Δημοφιλείς περιοχές",
    services: "Υπηρεσίες",
    reservationVerify: "Επαλήθευση κράτησης",
  },
  header: {
    memberLogin: "Σύνδεση μελών",
    searchVilla: "Αναζήτηση βίλας",
    menu: "Μενού",
    language: "Γλώσσα",
    selectLanguage: "Επιλέξτε γλώσσα",
  },
  footer: {
    quickLinks: "Γρήγοροι σύνδεσμοι",
    corporate: "Εταιρικά",
    popularRegions: "Δημοφιλείς περιοχές",
    neighborhoods: "Γειτονιές",
    contact: "Επικοινωνία",
    workingHours: "Ωράριο",
    allRightsReserved: "Όλα τα δικαιώματα διατηρούνται.",
    verifyTursab: "Ψηφιακή επαλήθευση TÜRSAB",
  },
  mobileNav: {
    home: "Αρχική",
    search: "Αναζήτηση",
    reservation: "Κράτηση",
    callUs: "Καλέστε μας",
    weWillCallYou: "Θα σας καλέσουμε",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "Αναζήτηση",
    close: "Κλείσιμο",
    loading: "Φόρτωση…",
    night: "Νύχτα",
    nights: "Νύχτες",
    guest: "Επισκέπτης",
    guests: "Επισκέπτες",
    from: "από",
    perNight: "ανά νύχτα",
    checkIn: "Άφιξη",
    checkOut: "Αναχώρηση",
    available: "Διαθέσιμο",
    booked: "Κλειστό",
    option: "Επιλογή",
    checkout: "Αναχώρηση",
    checkin: "Άφιξη",
    lastMinute: "Προσφορά τελευταίας στιγμής",
  },
  villa: villaDetailMessages.el,
  home: {
    heroAlt: "Τοπίο διακοπών",
    searchTitle: "Βρείτε τη βίλα των ονείρων σας",
  },
  booking: {
    preReservation: "Αποστολή αίτησης προκράτησης",
    sendRequest: "Αποστολή αίτησης",
    checkInDate: "Ημερομηνία άφιξης",
    checkOutDate: "Ημερομηνία αναχώρησης",
    adults: "Ενήλικες",
  },
};

const zhCore: CoreMessages = {
  nav: {
    villas: "别墅",
    deals: "优惠",
    regions: "地区",
    campaigns: "活动",
    loyalty: "忠诚计划",
    allVillas: "全部别墅",
    dealVillas: "优惠别墅",
    popularRegions: "热门地区",
    services: "服务",
    reservationVerify: "预订验证",
  },
  header: {
    memberLogin: "会员登录",
    searchVilla: "搜索别墅",
    menu: "菜单",
    language: "语言",
    selectLanguage: "选择语言",
  },
  footer: {
    quickLinks: "快速链接",
    corporate: "企业信息",
    popularRegions: "热门地区",
    neighborhoods: "社区",
    contact: "联系方式",
    workingHours: "工作时间",
    allRightsReserved: "版权所有。",
    verifyTursab: "TÜRSAB 数字验证",
  },
  mobileNav: {
    home: "首页",
    search: "搜索别墅",
    reservation: "预订",
    callUs: "致电我们",
    weWillCallYou: "我们给您回拨",
    whatsapp: "WhatsApp",
  },
  common: {
    search: "搜索",
    close: "关闭",
    loading: "加载中…",
    night: "晚",
    nights: "晚",
    guest: "位客人",
    guests: "位客人",
    from: "起",
    perNight: "每晚",
    checkIn: "入住",
    checkOut: "退房",
    available: "可预订",
    booked: "已满",
    option: "待定",
    checkout: "退房",
    checkin: "入住",
    lastMinute: "最后时刻优惠",
  },
  villa: villaDetailMessages.zh,
  home: {
    heroAlt: "度假风景",
    searchTitle: "找到您梦想中的别墅",
  },
  booking: {
    preReservation: "发送预订申请",
    sendRequest: "发送申请",
    checkInDate: "入住日期",
    checkOutDate: "退房日期",
    adults: "成人",
  },
};

export const messages: Record<AppLocale, AppMessages> = {
  tr: withCatalog("tr", trCore),
  en: withCatalog("en", enCore),
  de: withCatalog("de", deCore),
  fr: withCatalog("fr", frCore),
  es: withCatalog("es", esCore),
  bg: withCatalog("bg", bgCore),
  el: withCatalog("el", elCore),
  zh: withCatalog("zh", zhCore),
};
