import type { AppLocale } from "@/i18n/routing";

export type SearchMessages = {
  tabVilla: string;
  tabTour: string;
  tabHotel: string;
  tabFlightBus: string;
  tabTransfer: string;
  tabCarRental: string;
  tabDayTour: string;
  tabFerry: string;
  whereTo: string;
  regionPlaceholder: string;
  noRegionMatch: string;
  guestsLabel: string;
  guestCount: string;
  peopleLabel: string;
  peopleCount: string;
  selectDate: string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  adults: string;
  children: string;
  babies: string;
  pets: string;
  childrenAges: string;
  babiesAges: string;
  notInCapacity: string;
  close: string;
  done: string;
  selectCheckOutHint: string;
  nightsStay: string;
};

export type HomeExtraMessages = {
  heroTitleDefault: string;
  heroTitleBalayi: string;
  heroTitleTatilVillacisi: string;
  heroTitleGlamping: string;
  viewAll: string;
  travelAdventureTitle: string;
  travelAdventureSuffix: string;
  travelAddonVilla: string;
  travelAddonTesis: string;
  allFilter: string;
  villaCountLabel: string;
  sectionPopularTitle: string;
  sectionPopularSubtitle: string;
  sectionDealTitle: string;
  sectionDealSubtitle: string;
  sectionRecommendedTitle: string;
  sectionRecommendedSubtitle: string;
  dreamVacationTitle: string;
  dreamVacationSubtitle: string;
  officialHoliday: string;
};

export type ServicesMessages = {
  vipTransfer: string;
  tourActivity: string;
  hotelDesc: string;
  carRentalDesc: string;
  transferDesc: string;
  ferryDesc: string;
  tourDesc: string;
  flightDesc: string;
};

export type FooterExtraMessages = {
  noCorporatePages: string;
  noRegionsYet: string;
  tursabNoPrefix: string;
  tursabVerifyTitle: string;
  securePaymentAlt: string;
  paymentTrust: string;
  mahalleNavLabel: string;
};

export const searchMessages: Record<AppLocale, SearchMessages> = {
  tr: {
    tabVilla: "Villa",
    tabTour: "Tur",
    tabHotel: "Otel",
    tabFlightBus: "Uçak/Otobüs",
    tabTransfer: "Transfer",
    tabCarRental: "Araç Kiralama",
    tabDayTour: "Günübirlik Tur/Aktiviteler",
    tabFerry: "Feribot",
    whereTo: "Nereye gitmek istersin?",
    regionPlaceholder: "İl, bölge veya ilçe ara...",
    noRegionMatch: "Eşleşen bölge bulunamadı",
    guestsLabel: "Misafirler",
    guestCount: "{count} Misafir",
    peopleLabel: "Kişiler",
    peopleCount: "{count} kişi",
    selectDate: "Tarih seçin",
    previousMonth: "Önceki ay",
    nextMonth: "Sonraki ay",
    today: "Bugün",
    adults: "Yetişkinler",
    children: "Çocuklar",
    babies: "Bebekler",
    pets: "Evcil Hayvanlar",
    childrenAges: "3 - 12 yaş",
    babiesAges: "0 - 2 yaş · kapasiteye dahil değil",
    notInCapacity: "Kapasiteye dahil değil",
    close: "KAPAT",
    done: "Tamam",
    selectCheckOutHint:
      "Çıkış tarihini seçin — fare ile aralığı önizleyebilirsiniz",
    nightsStay: "{count} gece konaklama",
  },
  en: {
    tabVilla: "Villa",
    tabTour: "Tour",
    tabHotel: "Hotel",
    tabFlightBus: "Flight/Bus",
    tabTransfer: "Transfer",
    tabCarRental: "Car Rental",
    tabDayTour: "Day Tours/Activities",
    tabFerry: "Ferry",
    whereTo: "Where do you want to go?",
    regionPlaceholder: "Search city, region or district...",
    noRegionMatch: "No matching region found",
    guestsLabel: "Guests",
    guestCount: "{count} Guests",
    peopleLabel: "Guests",
    peopleCount: "{count} guests",
    selectDate: "Select date",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    today: "Today",
    adults: "Adults",
    children: "Children",
    babies: "Infants",
    pets: "Pets",
    childrenAges: "Ages 3 - 12",
    babiesAges: "Ages 0 - 2 · not counted in capacity",
    notInCapacity: "Not counted in capacity",
    close: "CLOSE",
    done: "Done",
    selectCheckOutHint: "Select check-out — hover to preview the range",
    nightsStay: "{count} night stay",
  },
  de: {
    tabVilla: "Villa",
    tabTour: "Tour",
    tabHotel: "Hotel",
    tabFlightBus: "Flug/Bus",
    tabTransfer: "Transfer",
    tabCarRental: "Autovermietung",
    tabDayTour: "Tagesausflüge/Aktivitäten",
    tabFerry: "Fähre",
    whereTo: "Wohin möchten Sie reisen?",
    regionPlaceholder: "Stadt, Region oder Bezirk suchen...",
    noRegionMatch: "Keine passende Region gefunden",
    guestsLabel: "Gäste",
    guestCount: "{count} Gäste",
    peopleLabel: "Personen",
    peopleCount: "{count} Personen",
    selectDate: "Datum wählen",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    today: "Heute",
    adults: "Erwachsene",
    children: "Kinder",
    babies: "Kleinkinder",
    pets: "Haustiere",
    childrenAges: "3 - 12 Jahre",
    babiesAges: "0 - 2 Jahre · zählt nicht zur Kapazität",
    notInCapacity: "Zählt nicht zur Kapazität",
    close: "SCHLIESSEN",
    done: "Fertig",
    selectCheckOutHint:
      "Abreisedatum wählen — mit der Maus den Zeitraum vorsehen",
    nightsStay: "{count} Nächte Aufenthalt",
  },
  fr: {
    tabVilla: "Villa",
    tabTour: "Circuit",
    tabHotel: "Hôtel",
    tabFlightBus: "Avion/Bus",
    tabTransfer: "Transfert",
    tabCarRental: "Location de voiture",
    tabDayTour: "Excursions/Activités",
    tabFerry: "Ferry",
    whereTo: "Où souhaitez-vous aller ?",
    regionPlaceholder: "Rechercher ville, région ou district...",
    noRegionMatch: "Aucune région correspondante",
    guestsLabel: "Voyageurs",
    guestCount: "{count} voyageurs",
    peopleLabel: "Voyageurs",
    peopleCount: "{count} voyageurs",
    selectDate: "Choisir une date",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    today: "Aujourd'hui",
    adults: "Adultes",
    children: "Enfants",
    babies: "Bébés",
    pets: "Animaux",
    childrenAges: "3 - 12 ans",
    babiesAges: "0 - 2 ans · non inclus dans la capacité",
    notInCapacity: "Non inclus dans la capacité",
    close: "FERMER",
    done: "OK",
    selectCheckOutHint:
      "Choisissez la date de départ — survolez pour prévisualiser",
    nightsStay: "{count} nuit(s) de séjour",
  },
  es: {
    tabVilla: "Villa",
    tabTour: "Tour",
    tabHotel: "Hotel",
    tabFlightBus: "Avión/Autobús",
    tabTransfer: "Traslado",
    tabCarRental: "Alquiler de coche",
    tabDayTour: "Tours/Actividades de un día",
    tabFerry: "Ferry",
    whereTo: "¿A dónde quieres ir?",
    regionPlaceholder: "Buscar ciudad, región o distrito...",
    noRegionMatch: "No se encontró ninguna región",
    guestsLabel: "Huéspedes",
    guestCount: "{count} huéspedes",
    peopleLabel: "Personas",
    peopleCount: "{count} personas",
    selectDate: "Seleccionar fecha",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    today: "Hoy",
    adults: "Adultos",
    children: "Niños",
    babies: "Bebés",
    pets: "Mascotas",
    childrenAges: "3 - 12 años",
    babiesAges: "0 - 2 años · no cuenta en la capacidad",
    notInCapacity: "No cuenta en la capacidad",
    close: "CERRAR",
    done: "Listo",
    selectCheckOutHint:
      "Seleccione la salida — pase el cursor para previsualizar",
    nightsStay: "{count} noche(s) de estancia",
  },
  bg: {
    tabVilla: "Вила",
    tabTour: "Тур",
    tabHotel: "Хотел",
    tabFlightBus: "Самолет/Автобус",
    tabTransfer: "Трансфер",
    tabCarRental: "Коли под наем",
    tabDayTour: "Еднодневни турове/Активности",
    tabFerry: "Ферибот",
    whereTo: "Къде искате да отидете?",
    regionPlaceholder: "Търсене на град, регион или район...",
    noRegionMatch: "Няма съвпадащ регион",
    guestsLabel: "Гости",
    guestCount: "{count} гости",
    peopleLabel: "Гости",
    peopleCount: "{count} гости",
    selectDate: "Изберете дата",
    previousMonth: "Предишен месец",
    nextMonth: "Следващ месец",
    today: "Днес",
    adults: "Възрастни",
    children: "Деца",
    babies: "Бебета",
    pets: "Домашни любимци",
    childrenAges: "3 - 12 години",
    babiesAges: "0 - 2 години · не се брои в капацитета",
    notInCapacity: "Не се брои в капацитета",
    close: "ЗАТВОРИ",
    done: "Готово",
    selectCheckOutHint:
      "Изберете дата на напускане — задръжте курсора за преглед",
    nightsStay: "{count} нощувки",
  },
  el: {
    tabVilla: "Βίλα",
    tabTour: "Περιήγηση",
    tabHotel: "Ξενοδοχείο",
    tabFlightBus: "Αεροπλάνο/Λεωφορείο",
    tabTransfer: "Μεταφορά",
    tabCarRental: "Ενοικίαση αυτοκινήτου",
    tabDayTour: "Ημερήσιες εκδρομές/Δραστηριότητες",
    tabFerry: "Φέρι",
    whereTo: "Πού θέλετε να πάτε;",
    regionPlaceholder: "Αναζήτηση πόλης, περιοχής ή δήμου...",
    noRegionMatch: "Δεν βρέθηκε περιοχή",
    guestsLabel: "Επισκέπτες",
    guestCount: "{count} επισκέπτες",
    peopleLabel: "Άτομα",
    peopleCount: "{count} άτομα",
    selectDate: "Επιλέξτε ημερομηνία",
    previousMonth: "Προηγούμενος μήνας",
    nextMonth: "Επόμενος μήνας",
    today: "Σήμερα",
    adults: "Ενήλικες",
    children: "Παιδιά",
    babies: "Βρέφη",
    pets: "Κατοικίδια",
    childrenAges: "3 - 12 ετών",
    babiesAges: "0 - 2 ετών · δεν μετράει στη χωρητικότητα",
    notInCapacity: "Δεν μετράει στη χωρητικότητα",
    close: "ΚΛΕΙΣΙΜΟ",
    done: "OK",
    selectCheckOutHint:
      "Επιλέξτε ημερομηνία αναχώρησης — τοποθετήστε τον δείκτη για προεπισκόπηση",
    nightsStay: "{count} διανυκτερεύσεις",
  },
  zh: {
    tabVilla: "别墅",
    tabTour: "旅游",
    tabHotel: "酒店",
    tabFlightBus: "飞机/巴士",
    tabTransfer: "接送",
    tabCarRental: "租车",
    tabDayTour: "一日游/活动",
    tabFerry: "渡轮",
    whereTo: "您想去哪里？",
    regionPlaceholder: "搜索城市、地区或区县...",
    noRegionMatch: "未找到匹配地区",
    guestsLabel: "客人",
    guestCount: "{count} 位客人",
    peopleLabel: "人数",
    peopleCount: "{count} 人",
    selectDate: "选择日期",
    previousMonth: "上个月",
    nextMonth: "下个月",
    today: "今天",
    adults: "成人",
    children: "儿童",
    babies: "婴儿",
    pets: "宠物",
    childrenAges: "3 - 12 岁",
    babiesAges: "0 - 2 岁 · 不计入容量",
    notInCapacity: "不计入容量",
    close: "关闭",
    done: "完成",
    selectCheckOutHint: "请选择退房日期 — 悬停可预览日期范围",
    nightsStay: "{count} 晚住宿",
  },
  ru: {
    tabVilla: "Вилла",
    tabTour: "Тур",
    tabHotel: "Отель",
    tabFlightBus: "Самолёт/Автобус",
    tabTransfer: "Трансфер",
    tabCarRental: "Аренда авто",
    tabDayTour: "Однодневные туры/активности",
    tabFerry: "Паром",
    whereTo: "Куда хотите поехать?",
    regionPlaceholder: "Поиск города, региона или района...",
    noRegionMatch: "Подходящий регион не найден",
    guestsLabel: "Гости",
    guestCount: "{count} гостей",
    peopleLabel: "Гости",
    peopleCount: "{count} гостей",
    selectDate: "Выберите дату",
    previousMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    today: "Сегодня",
    adults: "Взрослые",
    children: "Дети",
    babies: "Младенцы",
    pets: "Питомцы",
    childrenAges: "3 - 12 лет",
    babiesAges: "0 - 2 года · не учитываются в вместимости",
    notInCapacity: "Не учитывается в вместимости",
    close: "ЗАКРЫТЬ",
    done: "Готово",
    selectCheckOutHint:
      "Выберите дату выезда — наведите курсор для предпросмотра диапазона",
    nightsStay: "{count} ночей проживания",
  },
};

export const homeExtraMessages: Record<AppLocale, HomeExtraMessages> = {
  tr: {
    heroTitleDefault: "Yeni Maceranı Keşfet",
    heroTitleBalayi: "Aşkınıza Özel Hayalinizdeki Balayı Villaları",
    heroTitleTatilVillacisi: "Hayalinizdeki Tatil Villası Bir Tık Uzağınızda",
    heroTitleGlamping: "Doğanın İçinde Bungalov ve Dome Tatili",
    viewAll: "Tümünü Gör",
    travelAdventureTitle: "Seyahat Maceranız burada başlıyor",
    travelAdventureSuffix: "hizmetlerimizle tatilinizi uçtan uca planlayın.",
    travelAddonVilla:
      "Villa konaklamanıza ek olarak otel, transfer, araç kiralama ve ulaşım",
    travelAddonTesis:
      "Tesis konaklamanıza ek olarak otel, transfer, araç kiralama ve ulaşım",
    allFilter: "Tümü",
    villaCountLabel: "{count} Villa",
    sectionPopularTitle: "Popüler Villalar",
    sectionPopularSubtitle: "Sizin için seçtiklerimiz.",
    sectionDealTitle: "Fırsat Villalar",
    sectionDealSubtitle: "En uygun fiyatlarla tatilin keyfini çıkarın.",
    sectionRecommendedTitle: "Önerilen Villalar",
    sectionRecommendedSubtitle: "En çok tercih edilen villalar.",
    dreamVacationTitle: "Nasıl bir tatil hayal ediyorsunuz?",
    dreamVacationSubtitle:
      "İhtiyacınıza uygun villa stilini seçin; filtreli arama listesine anında geçin.",
    officialHoliday: "Resmi tatil",
  },
  en: {
    heroTitleDefault: "Discover Your New Adventure",
    heroTitleBalayi: "Dream Honeymoon Villas Made for Your Love",
    heroTitleTatilVillacisi: "Your Dream Holiday Villa Is Just a Click Away",
    heroTitleGlamping: "Bungalow and Dome Stays in Nature",
    viewAll: "View All",
    travelAdventureTitle: "Your travel adventure starts here",
    travelAdventureSuffix: "services to plan your holiday end to end.",
    travelAddonVilla:
      "In addition to your villa stay: hotel, transfer, car rental and transport",
    travelAddonTesis:
      "In addition to your property stay: hotel, transfer, car rental and transport",
    allFilter: "All",
    villaCountLabel: "{count} Villas",
    sectionPopularTitle: "Popular Villas",
    sectionPopularSubtitle: "Handpicked for you.",
    sectionDealTitle: "Deal Villas",
    sectionDealSubtitle: "Enjoy your holiday at the best prices.",
    sectionRecommendedTitle: "Recommended Villas",
    sectionRecommendedSubtitle: "Our most preferred villas.",
    dreamVacationTitle: "What kind of holiday do you dream of?",
    dreamVacationSubtitle:
      "Choose a villa style that fits your needs and jump straight into filtered search results.",
    officialHoliday: "Public holiday",
  },
  de: {
    heroTitleDefault: "Entdecken Sie Ihr neues Abenteuer",
    heroTitleBalayi: "Traumhafte Flitterwochen-Villen für Ihre Liebe",
    heroTitleTatilVillacisi: "Ihre Traumferienvilla nur einen Klick entfernt",
    heroTitleGlamping: "Bungalow- und Dome-Urlaub in der Natur",
    viewAll: "Alle anzeigen",
    travelAdventureTitle: "Ihr Reiseabenteuer beginnt hier",
    travelAdventureSuffix: "Dienstleistungen Ihren Urlaub von Anfang bis Ende planen.",
    travelAddonVilla:
      "Zusätzlich zu Ihrem Villa-Aufenthalt: Hotel, Transfer, Mietwagen und Transport",
    travelAddonTesis:
      "Zusätzlich zu Ihrem Unterkunftsaufenthalt: Hotel, Transfer, Mietwagen und Transport",
    allFilter: "Alle",
    villaCountLabel: "{count} Villen",
    sectionPopularTitle: "Beliebte Villen",
    sectionPopularSubtitle: "Für Sie ausgewählt.",
    sectionDealTitle: "Angebotsvillen",
    sectionDealSubtitle: "Genießen Sie Ihren Urlaub zu besten Preisen.",
    sectionRecommendedTitle: "Empfohlene Villen",
    sectionRecommendedSubtitle: "Unsere meistgewählten Villen.",
    dreamVacationTitle: "Von welchem Urlaub träumen Sie?",
    dreamVacationSubtitle:
      "Wählen Sie den passenden Villa-Stil und wechseln Sie direkt zur gefilterten Suche.",
    officialHoliday: "Feiertag",
  },
  fr: {
    heroTitleDefault: "Découvrez votre nouvelle aventure",
    heroTitleBalayi: "Villas de lune de miel conçues pour votre amour",
    heroTitleTatilVillacisi: "La villa de vacances de vos rêves à un clic",
    heroTitleGlamping: "Séjour bungalow et dôme au cœur de la nature",
    viewAll: "Voir tout",
    travelAdventureTitle: "Votre aventure commence ici",
    travelAdventureSuffix: "services pour planifier vos vacances de A à Z.",
    travelAddonVilla:
      "En plus de votre séjour en villa : hôtel, transfert, location de voiture et transport",
    travelAddonTesis:
      "En plus de votre séjour : hôtel, transfert, location de voiture et transport",
    allFilter: "Tout",
    villaCountLabel: "{count} villas",
    sectionPopularTitle: "Villas populaires",
    sectionPopularSubtitle: "Sélectionnées pour vous.",
    sectionDealTitle: "Villas en promotion",
    sectionDealSubtitle: "Profitez de vos vacances aux meilleurs prix.",
    sectionRecommendedTitle: "Villas recommandées",
    sectionRecommendedSubtitle: "Nos villas les plus appréciées.",
    dreamVacationTitle: "Quel type de vacances rêvez-vous ?",
    dreamVacationSubtitle:
      "Choisissez le style de villa adapté et passez directement à la recherche filtrée.",
    officialHoliday: "Jour férié",
  },
  es: {
    heroTitleDefault: "Descubre tu nueva aventura",
    heroTitleBalayi: "Villas de luna de miel soñadas para vuestro amor",
    heroTitleTatilVillacisi: "La villa de vacaciones de tus sueños a un clic",
    heroTitleGlamping: "Estancia en bungaló y domo en la naturaleza",
    viewAll: "Ver todo",
    travelAdventureTitle: "Tu aventura de viaje empieza aquí",
    travelAdventureSuffix: "servicios para planificar tus vacaciones de principio a fin.",
    travelAddonVilla:
      "Además de tu estancia en villa: hotel, traslado, alquiler de coche y transporte",
    travelAddonTesis:
      "Además de tu estancia: hotel, traslado, alquiler de coche y transporte",
    allFilter: "Todas",
    villaCountLabel: "{count} villas",
    sectionPopularTitle: "Villas populares",
    sectionPopularSubtitle: "Seleccionadas para ti.",
    sectionDealTitle: "Villas en oferta",
    sectionDealSubtitle: "Disfruta tus vacaciones a los mejores precios.",
    sectionRecommendedTitle: "Villas recomendadas",
    sectionRecommendedSubtitle: "Nuestras villas más elegidas.",
    dreamVacationTitle: "¿Qué tipo de vacaciones sueñas?",
    dreamVacationSubtitle:
      "Elige el estilo de villa que necesitas y pasa al instante a la búsqueda filtrada.",
    officialHoliday: "Festivo",
  },
  bg: {
    heroTitleDefault: "Открийте новото си приключение",
    heroTitleBalayi: "Мечтани вили за меден месец за вашата любов",
    heroTitleTatilVillacisi: "Вашата мечтана ваканционна вила само на клик",
    heroTitleGlamping: "Бунгало и купол сред природата",
    viewAll: "Виж всички",
    travelAdventureTitle: "Вашето пътешествие започва тук",
    travelAdventureSuffix: "услуги планирате почивката си от край до край.",
    travelAddonVilla:
      "В допълнение към престоя във вилата: хотел, трансфер, кола под наем и транспорт",
    travelAddonTesis:
      "В допълнение към престоя: хотел, трансфер, кола под наем и транспорт",
    allFilter: "Всички",
    villaCountLabel: "{count} вили",
    sectionPopularTitle: "Популярни вили",
    sectionPopularSubtitle: "Избрани за вас.",
    sectionDealTitle: "Вили на промоция",
    sectionDealSubtitle: "Насладете се на почивката на най-добри цени.",
    sectionRecommendedTitle: "Препоръчани вили",
    sectionRecommendedSubtitle: "Най-предпочитаните ни вили.",
    dreamVacationTitle: "Каква почивка си представяте?",
    dreamVacationSubtitle:
      "Изберете подходящия стил вила и преминете веднага към филтрираното търсене.",
    officialHoliday: "Официален празник",
  },
  el: {
    heroTitleDefault: "Ανακαλύψτε τη νέα σας περιπέτεια",
    heroTitleBalayi: "Ονειρεμένες βίλες μήνα του μέλιτος για τον έρωτά σας",
    heroTitleTatilVillacisi: "Η βίλα των ονείρων σας μόνο ένα κλικ μακριά",
    heroTitleGlamping: "Διαμονή σε μπανγκαλόου και θόλο στη φύση",
    viewAll: "Δείτε όλα",
    travelAdventureTitle: "Η ταξιδιωτική σας περιπέτεια ξεκινά εδώ",
    travelAdventureSuffix: "υπηρεσίες σχεδιάστε τις διακοπές σας από την αρχή έως το τέλος.",
    travelAddonVilla:
      "Εκτός από τη διαμονή στη βίλα: ξενοδοχείο, μεταφορά, ενοικίαση αυτοκινήτου και συγκοινωνία",
    travelAddonTesis:
      "Εκτός από τη διαμονή σας: ξενοδοχείο, μεταφορά, ενοικίαση αυτοκινήτου και συγκοινωνία",
    allFilter: "Όλα",
    villaCountLabel: "{count} βίλες",
    sectionPopularTitle: "Δημοφιλείς βίλες",
    sectionPopularSubtitle: "Επιλεγμένες για εσάς.",
    sectionDealTitle: "Βίλες προσφοράς",
    sectionDealSubtitle: "Απολαύστε τις διακοπές σας στις καλύτερες τιμές.",
    sectionRecommendedTitle: "Προτεινόμενες βίλες",
    sectionRecommendedSubtitle: "Οι πιο προτιμώμενες βίλες μας.",
    dreamVacationTitle: "Τι διακοπές ονειρεύεστε;",
    dreamVacationSubtitle:
      "Επιλέξτε το στυλ βίλας που σας ταιριάζει και μεταβείτε αμέσως στα φιλτραρισμένα αποτελέσματα.",
    officialHoliday: "Επίσημη αργία",
  },
  zh: {
    heroTitleDefault: "发现你的新冒险",
    heroTitleBalayi: "为你们的爱情打造的蜜月别墅",
    heroTitleTatilVillacisi: "理想的度假别墅触手可及",
    heroTitleGlamping: "自然中的小屋与穹顶假期",
    viewAll: "查看全部",
    travelAdventureTitle: "您的旅行冒险从这里开始",
    travelAdventureSuffix: "服务一站式规划您的假期。",
    travelAddonVilla: "除别墅住宿外，还可安排酒店、接送、租车与交通",
    travelAddonTesis: "除住宿外，还可安排酒店、接送、租车与交通",
    allFilter: "全部",
    villaCountLabel: "{count} 栋别墅",
    sectionPopularTitle: "热门别墅",
    sectionPopularSubtitle: "为您精选。",
    sectionDealTitle: "优惠别墅",
    sectionDealSubtitle: "以最优价格享受假期。",
    sectionRecommendedTitle: "推荐别墅",
    sectionRecommendedSubtitle: "最受欢迎的别墅。",
    dreamVacationTitle: "您梦想怎样的假期？",
    dreamVacationSubtitle: "选择适合您的别墅风格，立即进入筛选搜索结果。",
    officialHoliday: "公共假日",
  },
  ru: {
    heroTitleDefault: "Откройте новое приключение",
    heroTitleBalayi: "Виллы для медового месяца специально для вашей любви",
    heroTitleTatilVillacisi: "Вилла мечты для отпуска — в один клик",
    heroTitleGlamping: "Бунгало и купола на природе",
    viewAll: "Смотреть все",
    travelAdventureTitle: "Ваше путешествие начинается здесь",
    travelAdventureSuffix: "услугами спланируйте отпуск от начала до конца.",
    travelAddonVilla:
      "В дополнение к проживанию на вилле: отель, трансфер, аренда авто и транспорт",
    travelAddonTesis:
      "В дополнение к проживанию: отель, трансфер, аренда авто и транспорт",
    allFilter: "Все",
    villaCountLabel: "{count} вилл",
    sectionPopularTitle: "Популярные виллы",
    sectionPopularSubtitle: "Отобрано для вас.",
    sectionDealTitle: "Виллы со скидкой",
    sectionDealSubtitle: "Наслаждайтесь отпуском по лучшим ценам.",
    sectionRecommendedTitle: "Рекомендуемые виллы",
    sectionRecommendedSubtitle: "Наши самые популярные виллы.",
    dreamVacationTitle: "О каком отпуске вы мечтаете?",
    dreamVacationSubtitle:
      "Выберите стиль виллы под ваши нужды и сразу перейдите к фильтрованному поиску.",
    officialHoliday: "Государственный праздник",
  },
};

export const servicesMessages: Record<AppLocale, ServicesMessages> = {
  tr: {
    vipTransfer: "VIP Transfer",
    tourActivity: "Tur & Aktivite",
    hotelDesc: "Otelz ile konforlu konaklama",
    carRentalDesc: "Tatilinize özel araç seçenekleri",
    transferDesc: "Havalimanı ve şehir transferi",
    ferryDesc: "Ada ve liman geçişleri",
    tourDesc: "Yerel deneyimler ve turlar",
    flightDesc: "Ulaşım planınızı tamamlayın",
  },
  en: {
    vipTransfer: "VIP Transfer",
    tourActivity: "Tour & Activity",
    hotelDesc: "Comfortable stays with Otelz",
    carRentalDesc: "Car options tailored to your trip",
    transferDesc: "Airport and city transfers",
    ferryDesc: "Island and port crossings",
    tourDesc: "Local experiences and tours",
    flightDesc: "Complete your travel plans",
  },
  de: {
    vipTransfer: "VIP-Transfer",
    tourActivity: "Tour & Aktivität",
    hotelDesc: "Komfortable Unterkünfte mit Otelz",
    carRentalDesc: "Fahrzeugoptionen für Ihren Urlaub",
    transferDesc: "Flughafen- und Stadttransfers",
    ferryDesc: "Insel- und Hafenverbindungen",
    tourDesc: "Lokale Erlebnisse und Touren",
    flightDesc: "Vervollständigen Sie Ihre Reiseplanung",
  },
  fr: {
    vipTransfer: "Transfert VIP",
    tourActivity: "Circuit & Activité",
    hotelDesc: "Séjours confortables avec Otelz",
    carRentalDesc: "Options de véhicules pour vos vacances",
    transferDesc: "Transferts aéroport et ville",
    ferryDesc: "Traversées vers îles et ports",
    tourDesc: "Expériences locales et circuits",
    flightDesc: "Complétez votre plan de voyage",
  },
  es: {
    vipTransfer: "Traslado VIP",
    tourActivity: "Tour y actividad",
    hotelDesc: "Estancias cómodas con Otelz",
    carRentalDesc: "Opciones de coche para tu viaje",
    transferDesc: "Traslados aeropuerto y ciudad",
    ferryDesc: "Cruces a islas y puertos",
    tourDesc: "Experiencias locales y tours",
    flightDesc: "Completa tu plan de viaje",
  },
  bg: {
    vipTransfer: "VIP трансфер",
    tourActivity: "Тур и активност",
    hotelDesc: "Комфортен престой с Otelz",
    carRentalDesc: "Автомобили за вашата почивка",
    transferDesc: "Летищен и градски трансфер",
    ferryDesc: "Преминавания към острови и пристанища",
    tourDesc: "Местни преживявания и турове",
    flightDesc: "Завършете плана си за пътуване",
  },
  el: {
    vipTransfer: "VIP μεταφορά",
    tourActivity: "Περιήγηση και δραστηριότητα",
    hotelDesc: "Άνετη διαμονή με Otelz",
    carRentalDesc: "Επιλογές αυτοκινήτου για το ταξίδι σας",
    transferDesc: "Μεταφορές αεροδρομίου και πόλης",
    ferryDesc: "Διαδρομές προς νησιά και λιμάνια",
    tourDesc: "Τοπικές εμπειρίες και περιηγήσεις",
    flightDesc: "Ολοκληρώστε το ταξιδιωτικό σας πλάνο",
  },
  zh: {
    vipTransfer: "VIP 接送",
    tourActivity: "旅游与活动",
    hotelDesc: "通过 Otelz 舒适入住",
    carRentalDesc: "为旅途精选的租车选项",
    transferDesc: "机场与城市接送",
    ferryDesc: "岛屿与港口渡轮",
    tourDesc: "本地体验与行程",
    flightDesc: "完善您的出行计划",
  },
  ru: {
    vipTransfer: "VIP-трансфер",
    tourActivity: "Туры и активности",
    hotelDesc: "Комфортное проживание с Otelz",
    carRentalDesc: "Варианты авто под ваш отпуск",
    transferDesc: "Трансфер из аэропорта и по городу",
    ferryDesc: "Паромы на острова и в порты",
    tourDesc: "Местные впечатления и туры",
    flightDesc: "Завершите план поездки",
  },
};

export const footerExtraMessages: Record<AppLocale, FooterExtraMessages> = {
  tr: {
    noCorporatePages: "Henüz sayfa eklenmedi.",
    noRegionsYet: "Henüz bölge eklenmedi.",
    tursabNoPrefix: "TÜRSAB No:",
    tursabVerifyTitle: "TÜRSAB Dijital Doğrulama Sistemi",
    securePaymentAlt:
      "SSL güvenli bağlantı, %100 güvenli alışveriş, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "TÜRSAB belgeli acente. Ödeme SSL ve 3D Secure ile korunur.",
    mahalleNavLabel: "Mahalle kiralık villalar",
  },
  en: {
    noCorporatePages: "No pages added yet.",
    noRegionsYet: "No regions added yet.",
    tursabNoPrefix: "TÜRSAB No:",
    tursabVerifyTitle: "TÜRSAB Digital Verification System",
    securePaymentAlt:
      "SSL secure connection, 100% secure checkout, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "TÜRSAB-licensed agency. Card payments are protected by SSL and 3D Secure.",
    mahalleNavLabel: "Neighborhood rental villas",
  },
  de: {
    noCorporatePages: "Noch keine Seiten hinzugefügt.",
    noRegionsYet: "Noch keine Regionen hinzugefügt.",
    tursabNoPrefix: "TÜRSAB-Nr.:",
    tursabVerifyTitle: "TÜRSAB digitales Verifizierungssystem",
    securePaymentAlt:
      "SSL-sichere Verbindung, 100 % sicherer Einkauf, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "TÜRSAB-lizenziertes Reisebüro. Kartenzahlung mit SSL und 3D Secure.",
    mahalleNavLabel: "Villen zur Miete nach Stadtteil",
  },
  fr: {
    noCorporatePages: "Aucune page ajoutée pour le moment.",
    noRegionsYet: "Aucune région ajoutée pour le moment.",
    tursabNoPrefix: "N° TÜRSAB :",
    tursabVerifyTitle: "Système de vérification numérique TÜRSAB",
    securePaymentAlt:
      "Connexion SSL sécurisée, paiement 100 % sécurisé, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "Agence licenciée TÜRSAB. Paiement par carte protégé par SSL et 3D Secure.",
    mahalleNavLabel: "Villas à louer par quartier",
  },
  es: {
    noCorporatePages: "Aún no se han añadido páginas.",
    noRegionsYet: "Aún no se han añadido regiones.",
    tursabNoPrefix: "N.º TÜRSAB:",
    tursabVerifyTitle: "Sistema de verificación digital TÜRSAB",
    securePaymentAlt:
      "Conexión SSL segura, compra 100 % segura, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "Agencia con licencia TÜRSAB. El pago con tarjeta va protegido por SSL y 3D Secure.",
    mahalleNavLabel: "Villas de alquiler por barrio",
  },
  bg: {
    noCorporatePages: "Все още няма добавени страници.",
    noRegionsYet: "Все още няма добавени региони.",
    tursabNoPrefix: "TÜRSAB №:",
    tursabVerifyTitle: "TÜRSAB система за цифрова проверка",
    securePaymentAlt:
      "SSL сигурна връзка, 100% сигурно плащане, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "Агенция с лиценз TÜRSAB. Плащането с карта е защитено със SSL и 3D Secure.",
    mahalleNavLabel: "Вила под наем по квартал",
  },
  el: {
    noCorporatePages: "Δεν έχουν προστεθεί ακόμη σελίδες.",
    noRegionsYet: "Δεν έχουν προστεθεί ακόμη περιοχές.",
    tursabNoPrefix: "Αρ. TÜRSAB:",
    tursabVerifyTitle: "Σύστημα ψηφιακής επαλήθευσης TÜRSAB",
    securePaymentAlt:
      "Ασφαλής σύνδεση SSL, 100% ασφαλής αγορά, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "Πρακτορείο με άδεια TÜRSAB. Η πληρωμή με κάρτα προστατεύεται με SSL και 3D Secure.",
    mahalleNavLabel: "Ενοικιαζόμενες βίλες ανά γειτονιά",
  },
  zh: {
    noCorporatePages: "尚未添加页面。",
    noRegionsYet: "尚未添加地区。",
    tursabNoPrefix: "TÜRSAB 编号：",
    tursabVerifyTitle: "TÜRSAB 数字验证系统",
    securePaymentAlt:
      "SSL 安全连接、100% 安全结账、iyzico、Mastercard、Visa、American Express、Troy",
    paymentTrust: "持有 TÜRSAB 执照的旅行社。银行卡付款受 SSL 与 3D Secure 保护。",
    mahalleNavLabel: "社区可租别墅",
  },
  ru: {
    noCorporatePages: "Страницы ещё не добавлены.",
    noRegionsYet: "Регионы ещё не добавлены.",
    tursabNoPrefix: "№ TÜRSAB:",
    tursabVerifyTitle: "Цифровая система проверки TÜRSAB",
    securePaymentAlt:
      "SSL-защищённое соединение, 100% безопасная оплата, iyzico, Mastercard, Visa, American Express, Troy",
    paymentTrust:
      "Агентство с лицензией TÜRSAB. Оплата картой защищена SSL и 3D Secure.",
    mahalleNavLabel: "Аренда вилл по району",
  },
};
