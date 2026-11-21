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

const de: ContactMessages = {
  title: "Kontakt",
  helpSupport: "Hilfe / Support",
  writeUs: "schreiben Sie uns",
  officeMap: "Bürostandort",
  mapMissing: "Karte noch nicht hinterlegt",
  address: "Adresse",
  phone: "Telefon",
  phoneMissing: "Telefon nicht hinterlegt",
  workingHours: "Öffnungszeiten",
  socialMedia: "In sozialen Medien",
  formTitle: "Kontaktieren Sie uns!",
  formSubtitle: "Wie können wir Ihnen helfen?",
  firstName: "Vorname*",
  lastName: "Nachname*",
  email: "E-Mail-Adresse*",
  phoneLabel: "Telefonnummer",
  message: "Ihre Nachricht*",
  kvkkPrefix: "Ich habe die ",
  kvkkLink: "Datenschutzerklärung",
  kvkkSuffix: " gelesen.*",
  marketingOptIn:
    "Ich möchte Neuigkeiten und Angebote von {brand} erhalten.",
  detailsLink: "Mehr Informationen",
  sending: "Wird gesendet...",
  send: "SENDEN",
};

const fr: ContactMessages = {
  title: "Contact",
  helpSupport: "Aide / Support",
  writeUs: "écrivez-nous",
  officeMap: "Emplacement du bureau",
  mapMissing: "Carte non définie",
  address: "Adresse",
  phone: "Téléphone",
  phoneMissing: "Téléphone non défini",
  workingHours: "Horaires",
  socialMedia: "Sur les réseaux sociaux",
  formTitle: "Contactez-nous !",
  formSubtitle: "Comment pouvons-nous vous aider ?",
  firstName: "Prénom*",
  lastName: "Nom*",
  email: "Adresse e-mail*",
  phoneLabel: "Numéro de téléphone",
  message: "Votre message*",
  kvkkPrefix: "J'ai lu la ",
  kvkkLink: "politique de confidentialité",
  kvkkSuffix: ".*",
  marketingOptIn:
    "Je souhaite recevoir les actualités et campagnes de {brand}.",
  detailsLink: "Plus d'informations",
  sending: "Envoi...",
  send: "ENVOYER",
};

const es: ContactMessages = {
  title: "Contacto",
  helpSupport: "Ayuda / Soporte",
  writeUs: "escríbanos",
  officeMap: "Ubicación de la oficina",
  mapMissing: "Mapa aún no definido",
  address: "Dirección",
  phone: "Teléfono",
  phoneMissing: "Teléfono no definido",
  workingHours: "Horario",
  socialMedia: "En redes sociales",
  formTitle: "¡Póngase en contacto!",
  formSubtitle: "¿Cómo podemos ayudarle?",
  firstName: "Nombre*",
  lastName: "Apellidos*",
  email: "Correo electrónico*",
  phoneLabel: "Número de teléfono",
  message: "Su mensaje*",
  kvkkPrefix: "He leído el ",
  kvkkLink: "aviso de privacidad",
  kvkkSuffix: ".*",
  marketingOptIn:
    "Deseo recibir noticias y campañas de {brand}.",
  detailsLink: "Más información",
  sending: "Enviando...",
  send: "ENVIAR",
};

const bg: ContactMessages = {
  title: "Контакт",
  helpSupport: "Помощ / Поддръжка",
  writeUs: "пишете ни",
  officeMap: "Местоположение на офиса",
  mapMissing: "Картата все още не е зададена",
  address: "Адрес",
  phone: "Телефон",
  phoneMissing: "Телефонът не е зададен",
  workingHours: "Работно време",
  socialMedia: "В социалните мрежи",
  formTitle: "Свържете се с нас!",
  formSubtitle: "Как можем да ви помогнем?",
  firstName: "Име*",
  lastName: "Фамилия*",
  email: "Имейл адрес*",
  phoneLabel: "Телефонен номер",
  message: "Вашето съобщение*",
  kvkkPrefix: "Прочетох ",
  kvkkLink: "уведомлението за поверителност",
  kvkkSuffix: ".*",
  marketingOptIn:
    "Искам да получавам новини и кампании от {brand}.",
  detailsLink: "Повече информация",
  sending: "Изпращане...",
  send: "ИЗПРАТИ",
};

const el: ContactMessages = {
  title: "Επικοινωνία",
  helpSupport: "Βοήθεια / Υποστήριξη",
  writeUs: "γράψτε μας",
  officeMap: "Τοποθεσία γραφείου",
  mapMissing: "Ο χάρτης δεν έχει οριστεί ακόμη",
  address: "Διεύθυνση",
  phone: "Τηλέφωνο",
  phoneMissing: "Το τηλέφωνο δεν έχει οριστεί",
  workingHours: "Ώρες λειτουργίας",
  socialMedia: "Στα social media",
  formTitle: "Επικοινωνήστε μαζί μας!",
  formSubtitle: "Πώς μπορούμε να σας βοηθήσουμε;",
  firstName: "Όνομα*",
  lastName: "Επώνυμο*",
  email: "Διεύθυνση email*",
  phoneLabel: "Αριθμός τηλεφώνου",
  message: "Το μήνυμά σας*",
  kvkkPrefix: "Έχω διαβάσει την ",
  kvkkLink: "δήλωση απορρήτου",
  kvkkSuffix: ".*",
  marketingOptIn:
    "Θέλω να λαμβάνω νέα και καμπάνιες από την {brand}.",
  detailsLink: "Περισσότερες πληροφορίες",
  sending: "Αποστολή...",
  send: "ΑΠΟΣΤΟΛΗ",
};

const zh: ContactMessages = {
  title: "联系我们",
  helpSupport: "帮助 / 支持",
  writeUs: "给我们留言",
  officeMap: "办公地点",
  mapMissing: "地图尚未设置",
  address: "地址",
  phone: "电话",
  phoneMissing: "未设置电话",
  workingHours: "营业时间",
  socialMedia: "社交媒体",
  formTitle: "与我们联系！",
  formSubtitle: "我们能如何帮助您？",
  firstName: "名*",
  lastName: "姓*",
  email: "电子邮箱*",
  phoneLabel: "电话号码",
  message: "您的留言*",
  kvkkPrefix: "我已阅读",
  kvkkLink: "隐私声明",
  kvkkSuffix: "。*",
  marketingOptIn: "我希望接收来自 {brand} 的新闻和优惠活动。",
  detailsLink: "更多信息",
  sending: "发送中...",
  send: "发送",
};

const ru: ContactMessages = {
  title: "Контакты",
  helpSupport: "Помощь / Поддержка",
  writeUs: "напишите нам",
  officeMap: "Расположение офиса",
  mapMissing: "Карта ещё не задана",
  address: "Адрес",
  phone: "Телефон",
  phoneMissing: "Телефон не указан",
  workingHours: "Часы работы",
  socialMedia: "В социальных сетях",
  formTitle: "Свяжитесь с нами!",
  formSubtitle: "Чем мы можем помочь?",
  firstName: "Имя*",
  lastName: "Фамилия*",
  email: "Электронная почта*",
  phoneLabel: "Номер телефона",
  message: "Ваше сообщение*",
  kvkkPrefix: "Я прочитал(а) ",
  kvkkLink: "уведомление о конфиденциальности",
  kvkkSuffix: ".*",
  marketingOptIn:
    "Я хочу получать новости и акции от {brand}.",
  detailsLink: "Подробнее",
  sending: "Отправка...",
  send: "ОТПРАВИТЬ",
};

export const contactMessages: Record<AppLocale, ContactMessages> = {
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
