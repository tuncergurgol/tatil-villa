import type { PublicSiteKey } from "@/lib/public-site-keys";
import {
  getPublicListingCopy,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import type { RegionSeoGuide } from "@/lib/seo-region-guides";

export type RegionGuideFacts = {
  slug: string;
  name: string;
  areaLine: string;
  neighborhoods: string;
  concepts: string;
  airportLine: string;
  faqWhere: string;
  faqExtra?: { question: string; answer: string };
};

function brandLabel(siteKey: PublicSiteKey, brandName: string): string {
  return brandName.trim() || siteKey;
}

function adapt(siteKey: PublicSiteKey, text: string): string {
  return maybeRewriteVillaWording(text, siteKey);
}

export function buildRegionGuideFromFacts(
  facts: RegionGuideFacts,
  siteKey: PublicSiteKey,
  brandName: string
): RegionSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const units = getPublicListingCopy(siteKey).plural;
  const unit = getPublicListingCopy(siteKey).singular;
  const place = facts.name;

  const baseFaqs = [
    {
      question: `${place}'da ${unit.toLocaleLowerCase("tr")} seçerken hangi bölgeleri tercih etmeliyim?`,
      answer: facts.faqWhere,
    },
    {
      question: `Fiyata neler dahildir?`,
      answer: `Çoğu ilanda elektrik, su, Wi-Fi ve temel kullanım dahildir; ek temizlik, depozito veya ısıtma tesis bazında değişebilir. Rezervasyon koşulları esas alınır.`,
    },
    {
      question: `${place}'a ulaşım nasıl sağlanır?`,
      answer: facts.airportLine,
    },
    {
      question: `Rezervasyon sonrası iptal veya değişiklik nasıl olur?`,
      answer: `İptal ve değişiklik koşulları ilan ve döneme göre değişir. Onay mesajındaki sözleşme maddeleri geçerlidir; mümkün olan en erken iletişimi öneririz.`,
    },
  ];
  if (facts.faqExtra) baseFaqs.splice(1, 0, facts.faqExtra);

  if (siteKey === "glamping-turkey") {
    return {
      title: `${place} Glamping, Bungalov ve Dome | ${brand}`,
      description: adapt(
        siteKey,
        `${place} ve çevresinde doğa içi bungalov, dome ve glamping seçenekleri ${brand}'nda. Takvimi kontrol edin, güvenli rezervasyonla yerinizi ayırtın.`
      ),
      h1: `${place}'da Glamping ve Doğa İçi Konaklama`,
      sectionHeading: `${place}'da doğayla iç içe bir tatil`,
      paragraphs: [
        adapt(
          siteKey,
          `${facts.areaLine} ${brand} portföyünde ${place} çevresindeki bungalov ve dome alternatifleri, kalabalık resort ritminden uzak bir kaçış arayan misafirlere uygundur.`
        ),
        adapt(
          siteKey,
          `${facts.neighborhoods} Farklı kapasite ve konfor seviyeleri; çiftler, küçük aileler ve doğa odaklı planlar için bir arada listelenir.`
        ),
        adapt(
          siteKey,
          `${facts.concepts} İlan detayında mesafe, kapasite ve olanakları mutlaka doğrulayın.`
        ),
      ],
      faqs: baseFaqs.map((f) => ({
        question: adapt(siteKey, f.question),
        answer: adapt(siteKey, f.answer),
      })),
    };
  }

  if (siteKey === "balayi-villacisi") {
    return {
      title: `${place} Balayı Villası & Korunaklı Tatil | ${brand}`,
      description: `${place}'da jakuzili, muhafazakar ve deniz manzaralı balayı ${unit.toLocaleLowerCase("tr")} seçenekleri ${brand}'nda. Takvimi görün, güvenli rezervasyonla yerinizi ayırtın.`,
      h1: `${place} Balayı Villa Seçenekleri ve Romantik Tatil`,
      sectionHeading: `${place}'da balayı ve çiftlere özel villa tatili`,
      paragraphs: [
        `${facts.areaLine} ${brand} ile ${place} villaları; mahremiyet, jakuzi ve sakin teras akşamları isteyen çiftler için öne çıkar.`,
        `${facts.neighborhoods} Portföy; balayı çiftleri, korunaklı düzen arayan aileler ve manzara odaklı kaçışlar için alternatifler sunar.`,
        `Popüler konseptler: ${facts.concepts}`,
      ].map((p) => adapt(siteKey, p)),
      faqs: baseFaqs,
    };
  }

  return {
    title: `${place} Kiralık Villa & Özel Havuzlu Tatil | ${brand}`,
    description: `${place}'da deniz manzaralı, muhafazakar ve aile dostu kiralık ${units.toLocaleLowerCase("tr")} ${brand}'nda. Takvimi kontrol edin, güvenli rezervasyonla yerinizi ayırtın.`,
    h1: `${place} Kiralık Villa Seçenekleri ve Tatil Fırsatları`,
    sectionHeading: `${place}'da eşsiz bir villa tatili deneyimi`,
    paragraphs: [
      `${facts.areaLine} ${brand} bünyesindeki ${place} ${units.toLocaleLowerCase("tr")}; sakin, izole ve size ait bir alanda dinlenme fırsatı verir.`,
      `${facts.neighborhoods} Farklı bütçe ve kapasite beklentilerine göre alternatifler bir arada listelenir.`,
      `Popüler konseptler: ${facts.concepts}`,
    ].map((p) => adapt(siteKey, p)),
    faqs: baseFaqs,
  };
}

export const EXTRA_REGION_GUIDE_FACTS: RegionGuideFacts[] = [
  {
    slug: "kas",
    name: "Kaş",
    areaLine:
      "Kaş; limanı, dalış noktaları ve Meis’e yakın konumuyla Akdeniz’de hareketli ama butik bir tatil üssüdür.",
    neighborhoods:
      "Merkez, Çukurbağ, Bayındır ve çevre koy hatları; merkeze yürüyüş ile manzara dengesi isteyenlere farklı seçenekler sunar.",
    concepts:
      "deniz manzaralı teraslar, jakuzili balayı evleri, muhafazakar düzenli villalar ve merkeze yakın kompakt seçenekler.",
    airportLine:
      "En pratik havalimanı genellikle Dalaman (DLM) veya Antalya (AYT) olur; mesafe ve transfer süresi seçilen villanın konumuna göre değişir. Bölge içi koylar için araç kiralama önerilir.",
    faqWhere:
      "Limana ve çarşıya yakın olmak isteyenler merkez çevresini; daha sessiz ve manzaralı bir üs arayanlar Çukurbağ–Bayındır hattını değerlendirebilir.",
    faqExtra: {
      question: "Kaş’ta tekne ve dalış villa planına nasıl eklenir?",
      answer:
        "Liman çıkışlı günlük turlar ve dalış merkezleri merkeze yakındır. Villanın merkeze mesafesi, akşam dönüş konforunu belirler; ilan konum notunu kontrol edin.",
    },
  },
  {
    slug: "fethiye",
    name: "Fethiye",
    areaLine:
      "Fethiye; çarşısı, tekne turları ve çevre beldelere kolay ulaşımıyla Muğla kıyısının pratik villa üslerindendir.",
    neighborhoods:
      "Merkez, Çalış, Hisarönü–Ovacık ve yamaç mevkileri; market/hastane yakınlığı ile sessizlik arasında tercih yaptırır.",
    concepts:
      "aile villaları, özel havuzlu geniş evler, deniz manzaralı yamaç seçenekleri ve kısa süreli şehir üssü arayanlar için merkeze yakın konaklamalar.",
    airportLine:
      "Dalaman Havalimanı (DLM) Fethiye’ye görece yakındır. Transfer veya araç kiralama, Ölüdeniz ve Kayaköy gün gezilerini kolaylaştırır.",
    faqWhere:
      "Pratiklik isteyenler merkeze veya Çalış’a yakın villaları; daha sakin ve yeşil bir ritim arayanlar Hisarönü–Ovacık ve yamaçları tercih edebilir.",
  },
  {
    slug: "oludeniz",
    name: "Ölüdeniz",
    areaLine:
      "Ölüdeniz; lagün, Babadağ ve turkuaz koylarıyla yazın en bilinen Muğla destinasyonlarından biridir.",
    neighborhoods:
      "Lagüne yakın noktalar, yamaç manzaralı parseller ve Hisarönü bağlantılı konumlar farklı kalabalık–sakinlik dengeleri sunar.",
    concepts:
      "deniz/lagün manzaralı villalar, aile dostu özel havuzlu evler, jakuzili çift kaçışları ve yaz sezonu için erken rezervasyon gerektiren popüler stok.",
    airportLine:
      "Dalaman (DLM) üzerinden transfer yaygındır. Sezonda yol ve park yoğunluğu nedeniyle villanın lagüne mesafesini ve araç ihtiyacını önceden planlayın.",
    faqWhere:
      "Lagüne yürümek isteyenler daha merkezi konumları; akşam sessizliği arayanlar biraz içerideki yamaç villalarını tercih edebilir.",
    faqExtra: {
      question: "Ölüdeniz’de yüksek sezonda ne zaman rezervasyon yapılmalı?",
      answer:
        "Temmuz–Ağustos ve bayram haftaları erken dolar. Tarih netleşince ısıtmasız yaz stoku için bile birkaç hafta önceden ayırtmak güvenlidir.",
    },
  },
  {
    slug: "islamlar",
    name: "İslamlar",
    areaLine:
      "İslamlar; Kalkan’a bağlı, yayla serinliği, çınaraltı restoranları ve deniz manzaralı yamaç villalarıyla bilinen bir köy yerleşimidir.",
    neighborhoods:
      "Köy merkezi, üst yamaç manzara parselleri ve Kalkan’a inen yol hattı; mahremiyet ile merkeze uzaklık dengesini belirler.",
    concepts:
      "korunaklı/muhafazakar villalar, deniz manzaralı teraslar, balayı kaçışları ve yazın serin akşam isteyen aile evleri.",
    airportLine:
      "Dalaman (DLM) sonrası Kalkan yönüne devam edilir. Yokuşlu yollar için araç veya transfer önerilir; gece sürüşünde virajlara dikkat edin.",
    faqWhere:
      "Restoranlara yakın olmak isteyenler köy merkezine yakın evleri; daha izole manzara arayanlar üst yamaç parsellerini seçebilir.",
    faqExtra: {
      question: "İslamlar Kalkan merkeze ne kadar uzak?",
      answer:
        "Çoğu villa için araçla kısa–orta süreli bir iniş yeterlidir; tam süre villa konumuna göre değişir. İlan açıklamasındaki mesafe notunu okuyun.",
    },
  },
  {
    slug: "bodrum",
    name: "Bodrum",
    areaLine:
      "Bodrum; marina, gece hayatı ve yarımada koylarıyla Ege’de hem hareketli hem butik villa tatiline açıktır.",
    neighborhoods:
      "Yalıkavak, Türkbükü, Gümüşlük, Turgutreis ve merkez çevresi; sakinlik–sosyal hayat tercihine göre ayrılır.",
    concepts:
      "deniz manzaralı villalar, muhafazakar düzenli evler, geniş aile villaları ve marina’ya yakın kompakt seçenekler.",
    airportLine:
      "Bodrum-Milas Havalimanı (BJV) ana kapıdır. Yarımada içi mesafeler uzun olabilir; araç kiralama neredeyse zorunludur.",
    faqWhere:
      "Sakin koy ve gün batımı için Yalıkavak–Gümüşlük; daha merkezi ve sosyal bir ritim için Bodrum merkez–Türkbükü hattı sık tercih edilir.",
  },
  {
    slug: "marmaris",
    name: "Marmaris",
    areaLine:
      "Marmaris; limanı, çam ormanları ve çevre koylarıyla Muğla’da hem aile hem grup tatiline uygun bir üs sunar.",
    neighborhoods:
      "Merkez, İçmeler, Turunç ve yamaç mevkileri; plaja yakınlık ile sessizlik arasında seçim yaptırır.",
    concepts:
      "özel havuzlu aile villaları, deniz manzaralı yamaç evleri, grup kapasiteli büyük villalar ve merkeze yakın pratik seçenekler.",
    airportLine:
      "Dalaman (DLM) sık kullanılır. Koylar ve İçmeler–Turunç hattı için araç konforu artırır.",
    faqWhere:
      "Çarşı ve liman pratikliği isteyenler merkeze yakın villaları; daha sakin koy ritmi arayanlar İçmeler–Turunç ve çevresini değerlendirebilir.",
  },
  {
    slug: "dalyan",
    name: "Dalyan",
    areaLine:
      "Dalyan; kanağı, Caretta sahili ve sakin tempo isteyenlere özgü bir Muğla destinasyonudur.",
    neighborhoods:
      "Nehir kenarı, köy merkezi ve çevre sessiz parseller; tekneyle İztuzu günleri villa planına kolay eklenir.",
    concepts:
      "nehir/doğa manzaralı evler, aile villaları, bungalov düzenleri ve sakin kaçış arayan çift seçenekleri.",
    airportLine:
      "Dalaman Havalimanı (DLM) görece yakındır. İztuzu ve Köyceğiz çevresi için yerel tekne veya kısa transferler planlanabilir.",
    faqWhere:
      "Nehir manzarası ve tekne iskelesine yakınlık isteyenler kanal çevresini; daha müstakil bahçe arayanlar köyün sessiz parsellerini tercih edebilir.",
    faqExtra: {
      question: "Dalyan’da deniz plajı villanın yanında mı?",
      answer:
        "Çoğu villa nehir veya köy tarafındadır; İztuzu kumsalı genelde tekne veya kısa transferle ulaşılır. İlan konumunu buna göre okuyun.",
    },
  },
];
