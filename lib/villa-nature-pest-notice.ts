export const VILLA_NATURE_PEST_NOTICE = {
  title: "🌿 Doğa İçinde Konaklama ve İlaçlama Bilgilendirmesi",
  intro:
    "Doğanın kalbinde unutulmaz bir tatil deneyimi sunarken, evlerimizin bulunduğu ekosisteme ve doğal yaşama da saygı duyuyoruz.",
  items: [
    {
      label: "İlaçlama",
      text: "Tüm villalarımızda girişiniz öncesinde ve periyodik aralıklarla profesyonel ekiplerce haşere/böcek ilaçlaması yapılmaktadır.",
    },
    {
      label: "Doğal Yaşam",
      text: "Buna rağmen villamız yeşillikler ve doğa içerisinde yer aldığı için çevrede kelebek, uçuşan böcek veya sinek gibi canlıların görülmesi doğaldır.",
    },
    {
      label: "Öneri & Destek",
      text: "Doğanın tadını çıkarırken daha konforlu vakit geçirmeniz adına yanınızda koruyucu vücut spreyi bulundurmanızı tavsiye ederiz. Konaklamanız sırasında beklenmeyen bir durumla karşılaşmanız halinde saha ekibimiz destek için her zaman yanınızdadır.",
    },
  ],
} as const;

export function buildVillaNaturePestNoticeHtml() {
  const itemsHtml = VILLA_NATURE_PEST_NOTICE.items
    .map(
      (item) =>
        `<p><strong>${item.label}:</strong> ${item.text}</p>`
    )
    .join("\n");

  return `<p>${VILLA_NATURE_PEST_NOTICE.intro}</p>\n${itemsHtml}`;
}

export function buildVillaNaturePestNoticeExcerpt(max = 180) {
  const text = `${VILLA_NATURE_PEST_NOTICE.intro} ${VILLA_NATURE_PEST_NOTICE.items[0]?.text ?? ""}`.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
