import type { PublicSiteKey } from "@/lib/public-site-keys";
import {
  getPublicListingCopy,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import type { ListingSeoFaq, ListingSeoPayload } from "@/lib/seo-listing-content";
import { buildCategoryPath, buildGuidePath } from "@/lib/seo-matrix";
import {
  EXTRA_REGION_GUIDE_FACTS,
  buildRegionGuideFromFacts,
} from "@/lib/seo-region-guide-factory";

export type RegionSeoGuide = {
  title: string;
  description: string;
  h1: string;
  sectionHeading: string;
  paragraphs: string[];
  faqs: ListingSeoFaq[];
};

function brandLabel(siteKey: PublicSiteKey, brandName: string): string {
  return brandName.trim() || siteKey;
}

function unitPlural(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).plural;
}

function unitSingular(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).singular;
}

function buildKalkanGuide(
  siteKey: PublicSiteKey,
  brandName: string
): RegionSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const units = unitPlural(siteKey);
  const unit = unitSingular(siteKey);
  const copy = getPublicListingCopy(siteKey);

  if (siteKey === "glamping-turkey") {
    return {
      title: `Kalkan Glamping, Bungalov ve Dome Tatili | ${brand}`,
      description: maybeRewriteVillaWording(
        `Kalkan ve çevresinde doğa içi bungalov, dome ve glamping konaklama seçenekleri ${brand} güvencesiyle. Takvimi kontrol edin, güvenli rezervasyonla yerinizi ayırtın.`,
        siteKey
      ),
      h1: `Kalkan'da Glamping ve Doğa İçi Konaklama`,
      sectionHeading: `Kalkan'da doğayla iç içe bir tatil`,
      paragraphs: [
        `Antalya'nın Kaş ilçesine bağlı Kalkan; berrak denizi, tarihi dokusu ve yamaç yerleşimiyle Ege-Akdeniz hattında sakin bir kaçış sunar. ${brand} portföyünde Kalkan çevresindeki bungalov ve dome seçenekleri, kalabalık resort ortamından uzak bir konaklama arayan misafirler için uygundur.`,
        `Kalamar, Kördere, İslamlar, Kızıltaş ve Ortaalan gibi mevkilerde konumlanan alternatifler; çiftler, küçük aileler ve doğa odaklı tatil planları için farklı kapasite ve konfor seviyeleri sunar.`,
        `Popüler konseptler arasında korunaklı bahçeli üniteler, jakuzili romantik kaçışlar, deniz manzarasına yakın noktalar ve İslamlar–Üzümlü hattındaki serin, yeşil köy atmosferi yer alır. İlan detayında mesafeleri, kapasiteyi ve tesis özelliklerini mutlaka kontrol edin.`,
      ].map((p) => maybeRewriteVillaWording(p, siteKey)),
      faqs: [
        {
          question: `Kalkan'da konaklama için hangi bölgeleri tercih etmeliyim?`,
          answer: `Merkeze ve plaja yakın olmak isteyenler Ortaalan ve Kalamar mevkilerini; panoramik deniz manzarası arayanlar Kızıltaş ve Kördere'yi; doğayla iç içe ve daha serin bir hava isteyenler İslamlar ile Üzümlü çevresini değerlendirebilir.`,
        },
        {
          question: `Konaklama fiyatına neler dahildir?`,
          answer: `Çoğu ilanda elektrik, su, Wi-Fi ve temel kullanım kalemleri fiyata dahildir; ek temizlik, depozito veya ısıtma gibi kalemler villa/tesis bazında değişebilir. Rezervasyon özetindeki koşullar esas alınır.`,
        },
        {
          question: `Kalkan'a ulaşım nasıl sağlanır?`,
          answer: `En yakın havalimanı yaklaşık 125 km mesafedeki Dalaman Havalimanı'dır (DLM). Bölgenin yokuşlu yapısı ve çevre koylar için araç kiralama veya transfer hizmeti pratik olur.`,
        },
        {
          question: `Rezervasyon sonrası değişiklik veya iptal nasıl işler?`,
          answer: `İptal ve değişiklik koşulları ilan ve döneme göre değişir. Onay mesajındaki sözleşme maddeleri geçerlidir; mümkün olan en erken iletişimi öneririz.`,
        },
      ],
    };
  }

  if (siteKey === "balayi-villacisi") {
    return {
      title: `Kalkan Balayı Villası & Korunaklı Tatil | ${brand}`,
      description: `Kalkan'da jakuzili, muhafazakar ve deniz manzaralı balayı villası seçenekleri ${brand}'nda. Takvimi görün, güvenli rezervasyonla yerinizi ayırtın.`,
      h1: `Kalkan Balayı Villa Seçenekleri ve Romantik Tatil`,
      sectionHeading: `Kalkan'da balayı ve çiftlere özel villa tatili`,
      paragraphs: [
        `Antalya'nın Kaş ilçesine bağlı Kalkan; berrak denizi, tarihi dokusu ve dik yamaçlara kurulan mimarisiyle özel havuzlu villa tatilinin öne çıkan merkezlerindendir. Gün batımını teraslardan izleme imkânı sunan Kalkan villaları, gözlerden uzak ve size ait bir alanda dinlenme fırsatı verir.`,
        `Kalamar, Kördere, İslamlar, Kızıltaş ve Ortaalan gibi lokasyonlardaki portföyümüz; balayı çiftleri, mahremiyet arayan aileler ve deniz manzarası odaklı kaçışlar için farklı alternatifler barındırır.`,
        `Popüler konseptler: Muhafazakar & korunaklı villalar (havuz ve bahçe dışarıdan kapatılmış düzen); balayı villaları (jakuzi, ısıtmalı havuz, kompakt şık tasarım); lüks deniz manzaralı seçenekler; İslamlar ve Üzümlü hattında doğa içi köy villaları.`,
      ],
      faqs: [
        {
          question: `Kalkan'da villa kiralarken hangi bölgeleri tercih etmeliyim?`,
          answer: `Merkeze ve plaja yakın olmak isteyenler Ortaalan ve Kalamar'ı; kesintisiz panoramik deniz manzarası arayanlar Kızıltaş ve Kördere'yi; doğayla iç içe ve serin hava isteyenler İslamlar ile Üzümlü'yü tercih edebilir.`,
        },
        {
          question: `Kalkan villalarında havuzlar dışarıdan görünür mü?`,
          answer: `Muhafazakar konseptli villalarda havuz ve güneşlenme alanı çit, perde veya bitki örtüsüyle kapatılmış olabilir. Mahremiyet ihtiyacınız varsa ilan açıklamasında “muhafazakar / korunaklı” ifadesini ve galeriyi kontrol edin.`,
        },
        {
          question: `Villa kiralama fiyatlarına hangi hizmetler dahildir?`,
          answer: `Çoğu ilanda konaklama süresince elektrik, su, Wi-Fi ve temel kullanım dahildir; giriş temizliği ile havuz/bahçe bakımı da sıkça kapsama girer. Ek temizlik veya ısıtma ücreti villa bazında değişebilir — rezervasyon koşulları esas alınır.`,
        },
        {
          question: `Kalkan kiralık villalarına ulaşım nasıl sağlanır?`,
          answer: `En yakın havalimanı yaklaşık 125 km mesafedeki Dalaman Havalimanı'dır (DLM). Yokuşlu coğrafya ve çevre koylar için araç kiralama veya transfer önerilir.`,
        },
      ],
    };
  }

  // tatildeyiz + tatil-villacisi (ve varsayılan villa siteleri)
  return {
    title: `Kalkan Kiralık Villa & Özel Havuzlu Tatil Villaları | ${brand}`,
    description: `Kalkan'da deniz manzaralı, muhafazakar ve balayı konseptli kiralık villa seçenekleri ${brand}'nda. Takvimi kontrol edin, güvenli rezervasyonla yerinizi ayırtın.`,
    h1: `Kalkan Kiralık Villa Seçenekleri ve Tatil Fırsatları`,
    sectionHeading: `Kalkan'da eşsiz bir villa tatili deneyimi`,
    paragraphs: [
      `Antalya'nın Kaş ilçesine bağlı olan Kalkan; berrak denizi, tarihi dokusu ve dik yamaçlara kurulan mimarisiyle özel havuzlu villa kiralama arayanların sık tercih ettiği tatil merkezlerindendir. Akdeniz gün batımlarını panoramik teraslardan izleme imkânı sunan Kalkan kiralık villaları; daha sakin, izole ve size ait bir alanda dinlenme fırsatı tanır.`,
      `Kalamar, Kördere, İslamlar, Kızıltaş ve Ortaalan gibi Kalkan'ın öne çıkan lokasyonlarında konumlanan portföyümüz; farklı bütçe, aile yapısı ve tatil beklentilerine göre zengin alternatifler barındırır.`,
      `Popüler konseptler: Muhafazakar & korunaklı villalar — havuz terası ve bahçesi dışarıdan kapatılmış seçenekler. Balayı villaları — jakuzili, ısıtmalı havuzlu ve deniz manzaralı kompakt evler. Lüks ve deniz manzaralı seçenekler — infinity havuz, sauna veya hamam gibi ayrıcalıklar ilan bazında değişir. Doğa içi köy villaları — İslamlar ve Üzümlü hattında daha serin ve yeşil bir atmosfer.`,
    ],
    faqs: [
      {
        question: `Kalkan'da villa kiralarken hangi bölgeleri tercih etmeliyim?`,
        answer: `Merkeze ve plaja yakın olmak isteyenler Ortaalan ve Kalamar mevkilerini; kesintisiz panoramik deniz manzarası arayanlar Kızıltaş ve Kördere bölgelerini; doğayla iç içe ve serin bir hava tercih edenler ise İslamlar ile Üzümlü köylerini tercih edebilir.`,
      },
      {
        question: `Kalkan villalarında havuzlar dışarıdan görünür mü?`,
        answer: `Muhafazakar konseptli villalarımızda havuz ve güneşlenme terası çitler, perdeler veya doğal bitki örtüsüyle kapatılmış olabilir. Bu tür villalarda mahremiyet öncelikliyse ilan galerisini ve açıklamasını mutlaka kontrol edin.`,
      },
      {
        question: `Villa kiralama fiyatlarına hangi hizmetler dahildir?`,
        answer: `Çoğu ilanda konaklama süresince elektrik, su, internet (Wi-Fi), temel kullanım ile giriş temizliği ve düzenli havuz/bahçe bakımı fiyata dahildir. Kısa konaklamalarda ek temizlik veya ısıtma ücreti villa bazında uygulanabilir; kesin kapsam rezervasyon koşullarındadır.`,
      },
      {
        question: `Kalkan kiralık villalarına ulaşım nasıl sağlanır?`,
        answer: `Kalkan'a en yakın havalimanı yaklaşık 125 km mesafedeki Dalaman Havalimanı'dır (DLM). Bölgenin yokuşlu yapısı ve çevre koyları gezmek için araç kiralama veya transfer hizmeti önerilir.`,
      },
    ],
  };
}

const GUIDE_BUILDERS: Record<
  string,
  (siteKey: PublicSiteKey, brandName: string) => RegionSeoGuide
> = {
  kalkan: buildKalkanGuide,
  ...Object.fromEntries(
    EXTRA_REGION_GUIDE_FACTS.map((facts) => [
      facts.slug,
      (siteKey: PublicSiteKey, brandName: string) =>
        buildRegionGuideFromFacts(facts, siteKey, brandName),
    ])
  ),
};

export function getCuratedRegionSeoGuide(
  regionSlug: string,
  siteKey: PublicSiteKey,
  brandName: string
): RegionSeoGuide | null {
  const builder = GUIDE_BUILDERS[regionSlug.trim().toLowerCase()];
  if (!builder) return null;
  return builder(siteKey, brandName);
}

export function curatedRegionToListingSeo(
  guide: RegionSeoGuide,
  input: {
    siteKey: PublicSiteKey;
    regionSlug: string;
    regionName: string;
    relatedFacilities?: Array<{ slug: string; name: string }>;
  }
): ListingSeoPayload {
  const units = unitPlural(input.siteKey).toLocaleLowerCase("tr");
  const relatedLinks: ListingSeoPayload["relatedLinks"] = [
    {
      href: buildGuidePath(input.regionSlug),
      label: `${input.regionName} gezi rehberi`,
    },
    { href: "/villalar", label: `Tüm ${units}` },
    { href: "/sik-sorulan-sorular", label: "Sık sorulan sorular" },
  ];
  for (const facility of input.relatedFacilities?.slice(0, 4) ?? []) {
    relatedLinks.push({
      href: buildCategoryPath(`${input.regionSlug}-${facility.slug}`),
      label: `${input.regionName} ${facility.name}`,
    });
  }

  return {
    heading: guide.sectionHeading,
    paragraphs: guide.paragraphs,
    faqs: guide.faqs,
    relatedLinks,
  };
}
