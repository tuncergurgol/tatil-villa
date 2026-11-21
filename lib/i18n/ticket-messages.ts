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

const de: TicketMessages = {
  ...en,
  searchTitle: "Flug- / Bus tickets suchen",
  searchDescription:
    "Suchen Sie Flug- oder Busverbindungen, finden Sie das passende Ticket und buchen Sie sicher.",
  buyTitle: "Ticket kaufen",
  buyDescription: "Schließen Sie den Kauf Ihres ausgewählten Tickets ab.",
  resultTitle: "PNR / Ergebnis",
  resultDescription:
    "Sehen Sie Ihr Ticket nach dem Kauf. Nutzen Sie den PNR-Tab auf der Ticketsuche.",
  stepSearch: "Ticket suchen",
  stepBuy: "Kaufen",
  stepResult: "PNR / Ergebnis",
  stepsAria: "Ticket-Schritte",
  backHome: "← Startseite",
  backHomeCta: "Zur Startseite",
  searchCta: "Ticket suchen",
  securePayment: "Sichere Zahlung",
  instantETicket: "Sofortiges E-Ticket",
  allOperators: "Alle Anbieter an einem Ort",
  notConfigured:
    "Die Ticketsuche wird eingerichtet. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.",
  iframeSearchTitle: "Biletall — Ticket suchen",
  sessionMissingTitle: "Ticketsitzung nicht gefunden",
  sessionMissingBodyBefore:
    "Diese Seite öffnet sich nach Abschluss des Kaufs. Für eine PNR-Abfrage nutzen Sie den",
  sessionMissingPnr: "PNR-Suche",
  sessionMissingBodyAfter: "Tab auf der Ticketsuche.",
  sessionMissingSearchBefore: "Für eine neue Ticketsuche gehen Sie zur",
  sessionMissingSearchLink: "Ticketsuche",
  sessionMissingOr: "oder",
  sessionMissingHomeLink: "zur Startseite zurück",
};

const fr: TicketMessages = {
  ...en,
  searchTitle: "Rechercher billets avion / bus",
  searchDescription:
    "Recherchez des vols ou des bus, trouvez le bon billet et achetez en toute sécurité.",
  buyTitle: "Acheter un billet",
  buyDescription: "Finalisez l'achat du billet sélectionné.",
  resultTitle: "PNR / Résultat",
  resultDescription:
    "Consultez votre billet après l'achat. Utilisez l'onglet PNR sur l'écran de recherche.",
  stepSearch: "Rechercher",
  stepBuy: "Acheter",
  stepResult: "PNR / Résultat",
  stepsAria: "Étapes billet",
  backHome: "← Accueil",
  backHomeCta: "Retour à l'accueil",
  searchCta: "Rechercher un billet",
  securePayment: "Paiement sécurisé",
  instantETicket: "E-billet instantané",
  allOperators: "Tous les opérateurs au même endroit",
  notConfigured:
    "La recherche de billets est en cours de configuration. Réessayez bientôt ou contactez le service client.",
  iframeSearchTitle: "Biletall — Recherche de billets",
  sessionMissingTitle: "Session billet introuvable",
  sessionMissingBodyBefore:
    "Cette page s'ouvre après un achat. Pour consulter un PNR, utilisez l'onglet",
  sessionMissingPnr: "Recherche PNR",
  sessionMissingBodyAfter: "sur l'écran de recherche.",
  sessionMissingSearchBefore: "Pour une nouvelle recherche, allez à la",
  sessionMissingSearchLink: "page de recherche de billets",
  sessionMissingOr: "ou",
  sessionMissingHomeLink: "retournez à l'accueil",
};

const es: TicketMessages = {
  ...en,
  searchTitle: "Buscar billetes de avión / autobús",
  searchDescription:
    "Busque vuelos o autobuses, encuentre el billete adecuado y compre de forma segura.",
  buyTitle: "Comprar billete",
  buyDescription: "Complete la compra del billete seleccionado.",
  resultTitle: "PNR / Resultado",
  resultDescription:
    "Consulte su billete tras la compra. Use la pestaña PNR en la búsqueda.",
  stepSearch: "Buscar billete",
  stepBuy: "Comprar",
  stepResult: "PNR / Resultado",
  stepsAria: "Pasos del billete",
  backHome: "← Inicio",
  backHomeCta: "Volver al inicio",
  searchCta: "Buscar billete",
  securePayment: "Pago seguro",
  instantETicket: "E-billete instantáneo",
  allOperators: "Todas las compañías en un solo lugar",
  notConfigured:
    "La búsqueda de billetes se está configurando. Inténtelo de nuevo pronto o contacte con atención al cliente.",
  iframeSearchTitle: "Biletall — Buscar billetes",
  sessionMissingTitle: "Sesión de billete no encontrada",
  sessionMissingBodyBefore:
    "Esta página se abre tras completar la compra. Para consultar un PNR, use la pestaña",
  sessionMissingPnr: "Búsqueda PNR",
  sessionMissingBodyAfter: "en la pantalla de búsqueda.",
  sessionMissingSearchBefore: "Para buscar un nuevo billete, vaya a la",
  sessionMissingSearchLink: "página de búsqueda",
  sessionMissingOr: "o",
  sessionMissingHomeLink: "vuelva al inicio",
};

const bg: TicketMessages = {
  ...en,
  searchTitle: "Търсене на самолетни / автобусни билети",
  searchDescription:
    "Търсете полети или автобуси, намерете подходящия билет и купете сигурно.",
  buyTitle: "Купи билет",
  buyDescription: "Завършете покупката на избрания билет.",
  resultTitle: "PNR / Резултат",
  resultDescription:
    "Вижте билета си след покупка. Използвайте раздела PNR на екрана за търсене.",
  stepSearch: "Търси билет",
  stepBuy: "Купи",
  stepResult: "PNR / Резултат",
  stepsAria: "Стъпки за билет",
  backHome: "← Начало",
  backHomeCta: "Обратно към началото",
  searchCta: "Търси билет",
  securePayment: "Сигурно плащане",
  instantETicket: "Моментален е-билет",
  allOperators: "Всички оператори на едно място",
  notConfigured:
    "Търсенето на билети се конфигурира. Опитайте отново скоро или се свържете с поддръжката.",
  iframeSearchTitle: "Biletall — Търсене на билети",
  sessionMissingTitle: "Сесията за билет не е намерена",
  sessionMissingBodyBefore:
    "Тази страница се отваря след завършена покупка. За PNR използвайте раздела",
  sessionMissingPnr: "PNR търсене",
  sessionMissingBodyAfter: "на екрана за търсене.",
  sessionMissingSearchBefore: "За ново търсене отидете на",
  sessionMissingSearchLink: "страницата за търсене на билети",
  sessionMissingOr: "или",
  sessionMissingHomeLink: "се върнете към началото",
};

const el: TicketMessages = {
  ...en,
  searchTitle: "Αναζήτηση εισιτηρίων αεροπλάνου / λεωφορείου",
  searchDescription:
    "Αναζητήστε πτήσεις ή λεωφορεία, βρείτε το κατάλληλο εισιτήριο και αγοράστε με ασφάλεια.",
  buyTitle: "Αγορά εισιτηρίου",
  buyDescription: "Ολοκληρώστε την αγορά του επιλεγμένου εισιτηρίου.",
  resultTitle: "PNR / Αποτέλεσμα",
  resultDescription:
    "Δείτε το εισιτήριό σας μετά την αγορά. Χρησιμοποιήστε την καρτέλα PNR στην αναζήτηση.",
  stepSearch: "Αναζήτηση",
  stepBuy: "Αγορά",
  stepResult: "PNR / Αποτέλεσμα",
  stepsAria: "Βήματα εισιτηρίου",
  backHome: "← Αρχική",
  backHomeCta: "Επιστροφή στην αρχική",
  searchCta: "Αναζήτηση εισιτηρίου",
  securePayment: "Ασφαλής πληρωμή",
  instantETicket: "Άμεσο e-εισιτήριο",
  allOperators: "Όλοι οι πάροχοι σε ένα μέρος",
  notConfigured:
    "Η αναζήτηση εισιτηρίων ρυθμίζεται. Δοκιμάστε ξανά σύντομα ή επικοινωνήστε με την εξυπηρέτηση.",
  iframeSearchTitle: "Biletall — Αναζήτηση εισιτηρίων",
  sessionMissingTitle: "Η συνεδρία εισιτηρίου δεν βρέθηκε",
  sessionMissingBodyBefore:
    "Αυτή η σελίδα ανοίγει μετά την ολοκλήρωση αγοράς. Για PNR χρησιμοποιήστε την καρτέλα",
  sessionMissingPnr: "Αναζήτηση PNR",
  sessionMissingBodyAfter: "στην οθόνη αναζήτησης.",
  sessionMissingSearchBefore: "Για νέα αναζήτηση πηγαίνετε στη",
  sessionMissingSearchLink: "σελίδα αναζήτησης εισιτηρίων",
  sessionMissingOr: "ή",
  sessionMissingHomeLink: "επιστρέψτε στην αρχική",
};

const zh: TicketMessages = {
  ...en,
  searchTitle: "搜索机票 / 巴士票",
  searchDescription: "搜索航班或巴士班次，找到合适的票并安全购买。",
  buyTitle: "购买票务",
  buyDescription: "完成所选票务的购买。",
  resultTitle: "PNR / 结果",
  resultDescription: "购买后查看您的票。在搜索页使用 PNR 选项卡查询预订。",
  stepSearch: "搜票",
  stepBuy: "购买",
  stepResult: "PNR / 结果",
  stepsAria: "购票步骤",
  backHome: "← 首页",
  backHomeCta: "返回首页",
  searchCta: "搜索票务",
  securePayment: "安全支付",
  instantETicket: "即时电子票",
  allOperators: "所有运营商一站式",
  notConfigured: "票务搜索正在配置中。请稍后重试或联系客服。",
  iframeSearchTitle: "Biletall — 搜索票务",
  sessionMissingTitle: "未找到票务会话",
  sessionMissingBodyBefore: "此页面在购买完成后打开。查询 PNR 请使用搜索页的",
  sessionMissingPnr: "PNR 搜索",
  sessionMissingBodyAfter: "选项卡。",
  sessionMissingSearchBefore: "如需新搜索，请前往",
  sessionMissingSearchLink: "票务搜索页",
  sessionMissingOr: "或",
  sessionMissingHomeLink: "返回首页",
};

const ru: TicketMessages = {
  ...en,
  searchTitle: "Поиск авиа- / автобусных билетов",
  searchDescription:
    "Ищите рейсы самолёта или автобуса, выбирайте билет и покупайте безопасно.",
  buyTitle: "Купить билет",
  buyDescription: "Завершите покупку выбранного билета.",
  resultTitle: "PNR / Результат",
  resultDescription:
    "Просмотрите билет после покупки. Для поиска PNR используйте вкладку на экране поиска.",
  stepSearch: "Поиск билета",
  stepBuy: "Купить",
  stepResult: "PNR / Результат",
  stepsAria: "Шаги оформления билета",
  backHome: "← Главная",
  backHomeCta: "На главную",
  searchCta: "Искать билет",
  securePayment: "Безопасная оплата",
  instantETicket: "Мгновенный эл. билет",
  allOperators: "Все перевозчики в одном месте",
  notConfigured:
    "Поиск билетов настраивается. Попробуйте позже или свяжитесь со службой поддержки.",
  iframeSearchTitle: "Biletall — Поиск билетов",
  sessionMissingTitle: "Сессия билета не найдена",
  sessionMissingBodyBefore:
    "Эта страница открывается после завершения покупки. Для PNR используйте вкладку",
  sessionMissingPnr: "Поиск PNR",
  sessionMissingBodyAfter: "на экране поиска.",
  sessionMissingSearchBefore: "Для нового поиска перейдите на",
  sessionMissingSearchLink: "страницу поиска билетов",
  sessionMissingOr: "или",
  sessionMissingHomeLink: "вернитесь на главную",
};

export const ticketMessages: Record<AppLocale, TicketMessages> = {
  tr,
  en,
  de,
  fr,
  es,
  bg,
  el,
  zh,
  ru,
};
