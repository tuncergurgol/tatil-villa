import type { AppLocale } from "@/i18n/routing";

export type VillaDetailMessages = {
  availability: string;
  availabilityCalendar: string;
  availabilityHint: string;
  periodPrices: string;
  viewPeriodPrices: string;
  makeReservation: string;
  similarVillas: string;
  reviews: string;
  amenities: string;
  location: string;
  surroundingsAndLocation: string;
  knowBefore: string;
  faq: string;
  bedrooms: string;
  bathrooms: string;
  capacity: string;
  pools: string;
  poolInfo: string;
  notFound: string;
  detail: string;
  villaAmenities: string;
  home: string;
  overview: string;
  roomsAndCapacity: string;
  roomInfo: string;
  showOnMap: string;
  featuredFeatures: string;
  guestsCount: string;
  bedroomsCount: string;
  bathroomsCount: string;
  bedroomsCapacity: string;
  pool: string;
  poolN: string;
  width: string;
  length: string;
  depth: string;
  heatedPool: string;
  conservativePool: string;
  disinfected: string;
  poolMeasureMissing: string;
  calendarNotLoaded: string;
  distanceMissing: string;
  averageReviews: string;
  stayLabel: string;
  starsAria: string;
  documentNo: string;
  verifyPermitAria: string;
  previousMonth: string;
  nextMonth: string;
  previous: string;
  next: string;
  allAmenities: string;
  amenitiesCount: string;
  general: string;
  generalAmenitiesEmpty: string;
  close: string;
  share: string;
  copied: string;
  showAll: string;
  photoAria: string;
  checkInDesc: string;
  checkOutDesc: string;
  propertyRules: string;
  babyOk: string;
  babyNotOk: string;
  childOk: string;
  childNotOk: string;
  petsOk: string;
  petsNotOk: string;
  smokingOk: string;
  smokingNotOk: string;
  eventsOk: string;
  eventsNotOk: string;
  priceIncluded: string;
  priceExcluded: string;
  includedEmpty: string;
  damageDeposit: string;
  damageDepositSet: string;
  damageDepositMissing: string;
  betweenHours: string;
  periodsAvailable: string;
  nightly: string;
  noCurrentPeriods: string;
  minStayNights: string;
  minStayUnspecified: string;
  cleaningFeeInfo: string;
  pricesShownNightly: string;
  cleaningFeeNote: string;
  approximateMap: string;
  approximateMapNamed: string;
  mapLoading: string;
  approximateLocationNote: string;
  directions: string;
  selectDatesHint: string;
  selectDates: string;
  nightsTotal: string;
  total: string;
  discountApplied: string;
  selectDatesToCalculate: string;
  memberLoginDiscount: string;
  minStayInfo: string;
  guest: string;
  adults: string;
  children: string;
  babies: string;
  pets: string;
  selectDate: string;
  checkInDate: string;
  checkOutDate: string;
  preReservation: string;
  done: string;
  natureTitle: string;
  natureIntro: string;
  naturePestLabel: string;
  naturePestText: string;
  natureWildlifeLabel: string;
  natureWildlifeText: string;
  natureTipLabel: string;
  natureTipText: string;
  doubleBed: string;
  singleBed: string;
  noBeds: string;
  roomBedroom: string;
  roomLiving: string;
  roomKitchen: string;
  roomBath: string;
  meters: string;
  km: string;
};

const en: VillaDetailMessages = {
  availability: "Availability",
  availabilityCalendar: "Availability Calendar",
  availabilityHint:
    "Click dates to select check-in and check-out. Nightly prices are shown on available days.",
  periodPrices: "Seasonal Prices",
  viewPeriodPrices: "View Seasonal Prices",
  makeReservation: "Make a Reservation",
  similarVillas: "Similar Villas",
  reviews: "Guest Reviews",
  amenities: "Amenities",
  location: "Location",
  surroundingsAndLocation: "Area & Location",
  knowBefore: "Good to Know",
  faq: "Frequently Asked Questions",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  capacity: "Capacity",
  pools: "Pools",
  poolInfo: "Pool Details",
  notFound: "Villa Not Found",
  detail: "Villa Details",
  villaAmenities: "Villa Amenities",
  home: "Home",
  overview: "Overview",
  roomsAndCapacity: "Rooms & Capacity",
  roomInfo: "Room Details",
  showOnMap: "Show on Map",
  featuredFeatures: "Highlighted Features",
  guestsCount: "{count} guests",
  bedroomsCount: "{count} bedrooms",
  bathroomsCount: "{count} bathrooms",
  bedroomsCapacity: "{bedrooms} bedrooms ({guests} guest capacity)",
  pool: "Pool",
  poolN: "Pool {n}",
  width: "Width",
  length: "Length",
  depth: "Depth",
  heatedPool: "Heated Pool",
  conservativePool: "Secluded (Private) Pool",
  disinfected: "Disinfected: {method}",
  poolMeasureMissing: "Detailed pool measurements have not been added.",
  calendarNotLoaded:
    "Calendar data is not loaded yet. You can check seasonal prices.",
  distanceMissing: "Distance information has not been added yet.",
  averageReviews: "Average {rating} · {count} reviews",
  stayLabel: "Stay: {month}",
  starsAria: "{rating} stars",
  documentNo: "Permit No:",
  verifyPermitAria: "Verify tourism permit: {no}",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previous: "Previous",
  next: "Next",
  allAmenities: "All Amenities",
  amenitiesCount: "{count} amenities",
  general: "General",
  generalAmenitiesEmpty:
    "The general amenities list is empty. Tap the button to view all amenities.",
  close: "Close",
  share: "Share",
  copied: "Copied",
  showAll: "Show All",
  photoAria: "{name} photo {index}",
  checkInDesc: "Earliest and latest times you can check in.",
  checkOutDesc: "Latest time you can check out.",
  propertyRules: "House Rules",
  babyOk: "Baby friendly",
  babyNotOk: "Not baby friendly",
  childOk: "Child friendly",
  childNotOk: "Not child friendly",
  petsOk: "Pets allowed",
  petsNotOk: "Pets not allowed",
  smokingOk: "Smoking allowed",
  smokingNotOk: "No smoking",
  eventsOk: "Parties / events allowed",
  eventsNotOk: "No parties",
  priceIncluded: "What's included",
  priceExcluded: "Not included",
  includedEmpty: "No included items defined.",
  damageDeposit: "Damage Deposit",
  damageDepositSet:
    "The deposit is set at {amount}. If there is no damage during your stay, it is refunded at check-out.",
  damageDepositMissing: "No damage deposit is defined for the current period.",
  betweenHours: "{start} - {end}",
  periodsAvailable: "{count} periods available",
  nightly: "Nightly",
  noCurrentPeriods: "No current periods to display.",
  minStayNights: "Minimum {nights} night stay",
  minStayUnspecified: "Minimum stay not specified",
  cleaningFeeInfo: "Cleaning fee information",
  pricesShownNightly: "Prices are shown per night",
  cleaningFeeNote:
    "Stays under {nights} nights incur an extra {fee} cleaning fee.",
  approximateMap: "Approximate location map",
  approximateMapNamed: "{region} approximate location map",
  mapLoading: "Loading map…",
  approximateLocationNote:
    "Approximate location is shown; the exact address is shared after booking.{region}",
  directions: "Get directions",
  selectDatesHint: "Select dates to calculate the stay price",
  selectDates: "Select dates",
  nightsTotal: "{nights} Nights",
  total: "Total",
  discountApplied: "{label} applied",
  selectDatesToCalculate: "Select dates to calculate",
  memberLoginDiscount: "Log in as a member to earn loyalty discount",
  minStayInfo: "Info: Minimum stay is {nights} nights.",
  guest: "Guests",
  adults: "Adults",
  children: "Children",
  babies: "Infants",
  pets: "Pets",
  selectDate: "Select date",
  checkInDate: "Check-in Date",
  checkOutDate: "Check-out Date",
  preReservation: "Send Pre-Reservation Request",
  done: "Done",
  natureTitle: "🌿 Nature Stay & Pest Control Notice",
  natureIntro:
    "While offering an unforgettable holiday in the heart of nature, we also respect the ecosystem and wildlife around our homes.",
  naturePestLabel: "Pest control",
  naturePestText:
    "All our villas receive professional pest/insect treatment before your arrival and at regular intervals.",
  natureWildlifeLabel: "Wildlife",
  natureWildlifeText:
    "Because the villa sits among greenery and nature, seeing butterflies, flying insects or flies nearby is natural.",
  natureTipLabel: "Tip & support",
  natureTipText:
    "We recommend bringing protective body spray for a more comfortable stay. If anything unexpected happens during your stay, our field team is always ready to help.",
  doubleBed: "{count} double bed",
  singleBed: "{count} single bed",
  noBeds: "No beds",
  roomBedroom: "Bedroom",
  roomLiving: "Living room",
  roomKitchen: "Kitchen",
  roomBath: "Bathroom",
  meters: "m",
  km: "km",
};

const tr: VillaDetailMessages = {
  availability: "Müsaitlik",
  availabilityCalendar: "Müsaitlik Takvimi",
  availabilityHint:
    "Tarihlere tıklayarak giriş ve çıkış seçebilirsiniz. Müsait günlerde gecelik fiyatlar görünür.",
  periodPrices: "Dönemlik Fiyatlar",
  viewPeriodPrices: "Dönemlik Fiyatları Gör",
  makeReservation: "Rezervasyon Yap",
  similarVillas: "Benzer Villalar",
  reviews: "Misafir Yorumları",
  amenities: "Olanaklar",
  location: "Konum",
  surroundingsAndLocation: "Çevre ve Konum",
  knowBefore: "Bilmeniz Gerekenler",
  faq: "Sık Sorulan Sorular",
  bedrooms: "Yatak Odası",
  bathrooms: "Banyo",
  capacity: "Kapasite",
  pools: "Havuzlar",
  poolInfo: "Havuz Bilgileri",
  notFound: "Villa Bulunamadı",
  detail: "Villa Detayı",
  villaAmenities: "Villa Olanakları",
  home: "Anasayfa",
  overview: "Genel Bakış",
  roomsAndCapacity: "Oda & Kapasite",
  roomInfo: "Oda Bilgileri",
  showOnMap: "Haritada Göster",
  featuredFeatures: "Öne Çıkan Özellikler",
  guestsCount: "{count} Kişi",
  bedroomsCount: "{count} Yatak Odası",
  bathroomsCount: "{count} Banyo",
  bedroomsCapacity: "{bedrooms} Yatak Odası ({guests} kişi kapasiteli)",
  pool: "Havuz",
  poolN: "Havuz {n}",
  width: "En",
  length: "Boy",
  depth: "Derinlik",
  heatedPool: "Isıtmalı Havuz",
  conservativePool: "Muhafazakar (Korunaklı) Havuz",
  disinfected: "Dezenfekte: {method}",
  poolMeasureMissing: "Detaylı havuz ölçü bilgisi eklenmemiş.",
  calendarNotLoaded:
    "Takvim verisi henüz yüklenmemiş. Dönem fiyatlarına bakabilirsiniz.",
  distanceMissing: "Mesafe bilgisi henüz eklenmemiş.",
  averageReviews: "Ortalama {rating} · {count} yorum",
  stayLabel: "Konaklama: {month}",
  starsAria: "{rating} yıldız",
  documentNo: "Belge No:",
  verifyPermitAria: "Turizm belgesi doğrula: {no}",
  previousMonth: "Önceki ay",
  nextMonth: "Sonraki ay",
  previous: "Önceki",
  next: "Sonraki",
  allAmenities: "Tüm Olanaklar",
  amenitiesCount: "{count} olanak",
  general: "Genel",
  generalAmenitiesEmpty:
    "Genel olanak listesi boş. Tüm olanakları görüntülemek için butona tıklayın.",
  close: "Kapat",
  share: "Paylaş",
  copied: "Kopyalandı",
  showAll: "Tümünü Göster",
  photoAria: "{name} fotoğraf {index}",
  checkInDesc: "En erken ve en geç tesise giriş yapabileceğiniz saatler.",
  checkOutDesc: "En geç tesisten çıkış yapabileceğiniz saatler.",
  propertyRules: "Tesis Kuralları",
  babyOk: "Bebeğe Uygun",
  babyNotOk: "Bebeğe Uygun Değil",
  childOk: "Çocuğa Uygun",
  childNotOk: "Çocuğa Uygun Değil",
  petsOk: "Evcil Hayvan Kabul Edilir",
  petsNotOk: "Evcil Hayvan Kabul Edilmez",
  smokingOk: "Sigara İçilebilir",
  smokingNotOk: "Sigara İçilmez",
  eventsOk: "Parti / Etkinlik Yapılabilir",
  eventsNotOk: "Parti Yapılmaz",
  priceIncluded: "Ücrete Dahil olanlar",
  priceExcluded: "Ücrete Dahil olmayanlar",
  includedEmpty: "Dahil kalem tanımlanmamış.",
  damageDeposit: "Hasar Depozitosu",
  damageDepositSet:
    "Depozito ücreti {amount} olarak belirlenmiştir. Konaklama süresince tesiste herhangi bir zarar olmaması durumunda çıkışta iade edilir.",
  damageDepositMissing: "Güncel dönem için hasar depozitosu tanımlanmamış.",
  betweenHours: "{start} - {end} Arası",
  periodsAvailable: "{count} dönem mevcut",
  nightly: "Gecelik",
  noCurrentPeriods: "Gösterilecek güncel dönem bulunamadı.",
  minStayNights: "Minimum {nights} gece konaklama",
  minStayUnspecified: "Minimum konaklama belirtilmemiş",
  cleaningFeeInfo: "Temizlik ücreti bilgisi",
  pricesShownNightly: "Fiyatlar gecelik olarak gösterilmektedir",
  cleaningFeeNote:
    "{nights} Gece altındaki kiralamalarda ekstra {fee} temizlik ücreti alınmaktadır.",
  approximateMap: "Yaklaşık konum haritası",
  approximateMapNamed: "{region} yaklaşık konum haritası",
  mapLoading: "Harita yükleniyor…",
  approximateLocationNote:
    "Yaklaşık konum gösterilir; kesin adres rezervasyon sonrası paylaşılır.{region}",
  directions: "Yol tarifi",
  selectDatesHint: "Tarih seçerek konaklama bedelini hesaplayın",
  selectDates: "Tarih Seçiniz",
  nightsTotal: "{nights} Gece",
  total: "Toplam",
  discountApplied: "{label} uygulandı",
  selectDatesToCalculate: "Hesaplama için tarih seçin",
  memberLoginDiscount: "Üye girişiyle sadakat indirimi kazanın",
  minStayInfo: "Bilgi: Minimum konaklama {nights} gecedir.",
  guest: "Misafir",
  adults: "Yetişkin",
  children: "Çocuk",
  babies: "Bebek",
  pets: "Evcil Hayvan",
  selectDate: "Tarih seçin",
  checkInDate: "Giriş Tarihi",
  checkOutDate: "Çıkış Tarihi",
  preReservation: "Ön Rezervasyon Talebi Gönder",
  done: "Tamam",
  natureTitle: "🌿 Doğa İçinde Konaklama ve İlaçlama Bilgilendirmesi",
  natureIntro:
    "Doğanın kalbinde unutulmaz bir tatil deneyimi sunarken, evlerimizin bulunduğu ekosisteme ve doğal yaşama da saygı duyuyoruz.",
  naturePestLabel: "İlaçlama",
  naturePestText:
    "Tüm villalarımızda girişiniz öncesinde ve periyodik aralıklarla profesyonel ekiplerce haşere/böcek ilaçlaması yapılmaktadır.",
  natureWildlifeLabel: "Doğal Yaşam",
  natureWildlifeText:
    "Buna rağmen villamız yeşillikler ve doğa içerisinde yer aldığı için çevrede kelebek, uçuşan böcek veya sinek gibi canlıların görülmesi doğaldır.",
  natureTipLabel: "Öneri & Destek",
  natureTipText:
    "Doğanın tadını çıkarırken daha konforlu vakit geçirmeniz adına yanınızda koruyucu vücut spreyi bulundurmanızı tavsiye ederiz. Konaklama sırasında beklenmeyen bir durumla karşılaşmanız halinde saha ekibimiz destek için her zaman yanınızdadır.",
  doubleBed: "{count} Çift Kişilik Yatak",
  singleBed: "{count} Tek Kişilik Yatak",
  noBeds: "Yatak yok",
  roomBedroom: "Yatak Odası",
  roomLiving: "Salon",
  roomKitchen: "Mutfak",
  roomBath: "Banyo",
  meters: "Metre",
  km: "Km",
};

export const villaDetailMessages: Record<AppLocale, VillaDetailMessages> = {
  tr,
  en,
  de: { ...en },
  fr: { ...en },
  es: { ...en },
  bg: { ...en },
  el: { ...en },
  zh: { ...en },
};
