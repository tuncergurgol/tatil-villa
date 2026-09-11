export const HOME_CAMPAIGNS = [
  {
    title: "Tüm Kredi Kartlarına 12 Taksit İmkanı",
    subtitle:
      "Hayalinizdeki villa tatilini bütçenize yayın; tüm kredi kartlarına 12 aya varan taksit.",
    image: "/campaigns/kampanya-12-taksit.jpg",
    cta: "Detayları Gör",
    href: "/kampanyalar/12-taksit",
    displayType: "SLIDER" as const,
    sortOrder: 1,
    active: true,
  },
  {
    title: "Sadakat Programı",
    subtitle:
      "Üye olun, konakladıkça sınıfınız yükselsin; rezervasyonda %7'ye varan indirim kazanın.",
    image: "/campaigns/kampanya-sadakat.jpg",
    cta: "Programı İncele",
    href: "/sadakat",
    displayType: "SLIDER" as const,
    sortOrder: 2,
    active: true,
  },
  {
    title: "Tatilinizin sonuna kadar yanınızdayız",
    subtitle:
      "Rezervasyondan çıkış gününe kadar kişisel tatil danışmanı desteği.",
    image: "/campaigns/kampanya-tatil-danismani.jpg",
    cta: "Danışmanı Ara",
    href: "/kampanyalar/tatil-danismani",
    displayType: "SLIDER" as const,
    sortOrder: 3,
    active: true,
  },
  {
    title: "2027 yılı Erken Rezervasyon Fırsatları",
    subtitle:
      "2027 fiyatı açıklanan villaları şimdiden seçin, popüler tarihleri kaçırmayın.",
    image: "/campaigns/kampanya-2027-erken-rezervasyon.jpg",
    cta: "Villaları Gör",
    href: "/kampanyalar/2027-erken-rezervasyon",
    displayType: "SLIDER" as const,
    sortOrder: 4,
    active: true,
  },
] as const;

export const EARLY_BOOKING_PRICE_YEAR = 2027;
