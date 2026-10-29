import type { PublicSiteKey } from "@/lib/public-site-keys";
import {
  getPublicListingCopy,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import type { ListingSeoFaq, ListingSeoPayload } from "@/lib/seo-listing-content";
import type { RegionSeoGuide } from "@/lib/seo-region-guides";
import { buildCategoryPath, buildGuidePath } from "@/lib/seo-matrix";
import { EARLY_BOOKING_PRICE_YEAR } from "@/lib/home-campaigns";

export type TopicSeoGuide = RegionSeoGuide;

function brandLabel(siteKey: PublicSiteKey, brandName: string): string {
  return brandName.trim() || siteKey;
}

function unitsOf(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).plural;
}

function unitOf(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).singular;
}

function adapt(siteKey: PublicSiteKey, text: string): string {
  return maybeRewriteVillaWording(text, siteKey);
}

function withPlace(place: string | undefined, title: string): string {
  return place ? `${place} ${title}` : title;
}

function buildBalayiGuide(
  siteKey: PublicSiteKey,
  brandName: string,
  place?: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const unit = unitOf(siteKey).toLocaleLowerCase("tr");
  const label = withPlace(place, "Balayı Villaları");

  if (siteKey === "glamping-turkey") {
    return {
      title: `${withPlace(place, "Balayı ve Romantik Glamping")} | ${brand}`,
      description: adapt(
        siteKey,
        `${place ? `${place}'da ` : ""}çiftlere özel bungalov ve dome seçenekleri ${brand}'nda. Jakuzi, korunaklı bahçe ve sakin kaçış için takvimi kontrol edin.`
      ),
      h1: withPlace(place, "Balayı ve Romantik Kaçış Seçenekleri"),
      sectionHeading: `${place ? `${place}'da ` : ""}romantik bir kaçış planlayın`,
      paragraphs: [
        adapt(
          siteKey,
          `Balayı ve yıldönümü tatilleri; mahremiyet, şık detay ve sakin bir ortam ister. ${brand} portföyünde jakuzili, korunaklı ve doğa içi üniteler bu beklentiye göre filtrelenebilir.`
        ),
        adapt(
          siteKey,
          `Konum seçerken merkeze yakınlık, manzara ve ulaşım süresini birlikte değerlendirin. İlan galerisi, kapasite ve ek olanaklar rezervasyon öncesi netleştirilmelidir.`
        ),
        adapt(
          siteKey,
          `İlgili kategoriler: jakuzili üniteler, korunaklı bahçeli seçenekler ve deniz manzarasına yakın noktalar. Uygun tarihi erken ayırtmak yüksek sezonda kritik olabilir.`
        ),
      ],
      faqs: balayiFaqs(unit, place),
    };
  }

  return {
    title: `${label} & Romantik Tatil | ${brand}`,
    description: `${place ? `${place}'da ` : ""}jakuzili, muhafazakar ve deniz manzaralı balayı ${unit} seçenekleri ${brand}'nda. Güvenli rezervasyonla yerinizi ayırtın.`,
    h1: `${label} Seçenekleri ve Romantik Tatil`,
    sectionHeading: `${place ? `${place}'da ` : ""}balayı villa tatili rehberi`,
    paragraphs: [
      `Balayı tatili; mahremiyet, özel havuz/jakuzi ve sakin bir atmosfer odaklı planlanır. ${brand} bünyesindeki balayı ${unit} seçenekleri çiftlerin bu beklentisine göre listelenir.`,
      `Popüler tercihler arasında muhafazakar düzenli evler, deniz manzaralı teraslar, ısıtmalı havuzlu konfor ve kompakt ama donanımlı villalar yer alır. Bölge seçiminde Kalkan, Kaş, Fethiye ve İslamlar sık öne çıkar.`,
      `Rezervasyon öncesi takvim, minimum konaklama, depozito ve iptal koşullarını ilan üzerinden kontrol edin. Transfer veya araç kiralama, yokuşlu bölgelerde konforu artırır.`,
    ].map((p) => adapt(siteKey, p)),
    faqs: balayiFaqs(unit, place),
  };
}

function balayiFaqs(unit: string, place?: string): ListingSeoFaq[] {
  const where = place ? `${place}'da ` : "";
  return [
    {
      question: `${where}balayı ${unit} seçerken nelere bakmalıyım?`,
      answer: `Mahremiyet (muhafazakar/korunaklı düzen), jakuzi veya özel havuz, manzara ve merkeze uzaklık öncelikli kriterlerdir. Kapasite genellikle 2 kişilik planlar için yeterlidir; ekstra misafir varsa ilanı doğrulayın.`,
    },
    {
      question: `Balayı villalarında havuz dışarıdan görünür mü?`,
      answer: `Muhafazakar etiketli ilanlarda havuz ve güneşlenme alanı kapatılmış olabilir. Mahremiyet kritikse galeri ve açıklamadaki “korunaklı / muhafazakar” ifadelerini kontrol edin.`,
    },
    {
      question: `En iyi balayı dönemi ne zamandır?`,
      answer: `Mayıs-Haziran ve Eylül-Ekim daha sakin ve ılıman geçer. Temmuz-Ağustos deniz sezonunun zirvesidir; kış ve ara tatilde ısıtmalı veya kapalı havuzlu seçenekler avantajlıdır.`,
    },
    {
      question: `Fiyata neler dahildir?`,
      answer: `Çoğu ilanda elektrik, su, Wi-Fi ve temel kullanım dahildir; ek temizlik veya ısıtma villa bazında değişebilir. Kesin kapsam rezervasyon koşullarındadır.`,
    },
  ];
}

function buildIsitmaliGuide(
  siteKey: PublicSiteKey,
  brandName: string,
  place?: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const unit = unitOf(siteKey).toLocaleLowerCase("tr");
  const label = withPlace(place, "Isıtmalı Havuzlu Villalar");

  return {
    title: `${adapt(siteKey, label)} | ${brand}`,
    description: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}ısıtmalı havuzlu kiralık ${unit} seçenekleri ${brand}'nda. Kış, sömestir ve ara tatil planları için takvimi kontrol edin.`
    ),
    h1: adapt(siteKey, `${label} ile Dört Mevsim Tatil`),
    sectionHeading: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}ısıtmalı havuzlu villa rehberi`
    ),
    paragraphs: [
      adapt(
        siteKey,
        `Isıtmalı havuz; kış, sonbahar ve sömestir tatillerinde yüzme konforunu uzatır. ${brand} listesinde ısıtmalı havuz filtresi, bu özelliği sağlayan ${unit} seçeneklerini bir araya getirir.`
      ),
      adapt(
        siteKey,
        `Kalkan, Kaş, Fethiye ve İslamlar hattında ısıtmalı veya kapalı havuzlu evler sık aranır. Havuz tipi (açık ısıtmalı / kapalı), ısınma süresi ve ek ücret ilan bazında değişebilir.`
      ),
      adapt(
        siteKey,
        `Aileler çocuk havuzu ve bahçeyi, çiftler jakuzi ve manzarayı birlikte değerlendirebilir. Erken rezervasyon, tatil dönemlerinde müsaitliği korumak için önemlidir.`
      ),
    ],
    faqs: [
      {
        question: `Isıtmalı havuz her mevsim çalışır mı?`,
        answer: `Çoğu villada ısıtma sezonluk veya talep üzerine açılır. Rezervasyon sırasında ısıtmanın dahil mi yoksa ek ücretli mi olduğunu netleştirin.`,
      },
      {
        question: `Isıtmalı ile kapalı havuz aynı şey midir?`,
        answer: `Hayır. Kapalı havuz yağmurdan bağımsız yüzme sunar; ısıtmalı açık havuz ise su sıcaklığını yükseltir. İkisinin bir arada olduğu ilanlar da vardır.`,
      },
      {
        question: `${place ? `${place}'da ` : ""}kışın hangi bölgeler tercih edilir?`,
        answer: `Kalkan–İslamlar ve Fethiye çevresi kış/ara tatilde sık seçilir. Serin akşamlarda ısıtmalı havuz ve şömine/ısıtma olanakları konforu artırır.`,
      },
      {
        question: `Fiyatlar yaz sezonuna göre nasıl değişir?`,
        answer: `Kış ve ara sezonda gecelik fiyatlar genelde daha esnektir; resmi tatil ve sömestir haftalarında talep artabilir. Listede görünen rakam güncel döneme aittir.`,
      },
    ],
  };
}

function buildDenizManzaraGuide(
  siteKey: PublicSiteKey,
  brandName: string,
  place?: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const unit = unitOf(siteKey).toLocaleLowerCase("tr");
  const label = withPlace(place, "Deniz Manzaralı Villalar");

  return {
    title: `${adapt(siteKey, label)} | ${brand}`,
    description: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}deniz manzaralı kiralık ${unit} seçenekleri ${brand}'nda. Teras, gün batımı ve koy manzarası için ilanları inceleyin.`
    ),
    h1: adapt(siteKey, `${label} ve Manzaralı Tatil`),
    sectionHeading: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}deniz manzaralı villa seçim rehberi`
    ),
    paragraphs: [
      adapt(
        siteKey,
        `Deniz manzarası; gün batımı, teras keyfi ve açık ufuk arayan tatilciler için belirleyici bir filtredir. ${brand} portföyünde bu etiket, manzarası öne çıkan ${unit} ilanlarını gruplar.`
      ),
      adapt(
        siteKey,
        `Kalkan yamaçları (Kızıltaş, Kördere), Kaş ve Fethiye–Ölüdeniz hattı manzara arayışında sık öne çıkar. Manzaranın kesintisiz olup olmadığı galeri ve konum haritasından doğrulanmalıdır.`
      ),
      adapt(
        siteKey,
        `Manzaralı villalarda rüzgâr, merdiven/yokuş ve merkeze uzaklık da konforu etkiler. Araç ihtiyacı ve yürüyüş mesafesini rezervasyon öncesi planlayın.`
      ),
    ],
    faqs: [
      {
        question: `Deniz manzaralı her villa denize yakın mıdır?`,
        answer: `Hayır. Manzara ile yürüme mesafesi farklıdır. Denize sıfır veya plaja yakınlık ayrı kriterlerdir; ilandaki mesafe bilgisini kontrol edin.`,
      },
      {
        question: `Manzara odadan mı yoksa yalnızca terastan mı görünür?`,
        answer: `Villaya göre değişir. Yatak odası, salon veya yalnızca üst teras manzarası olabilir; galeri ve açıklama bunu netleştirir.`,
      },
      {
        question: `Hangi bölgeler manzara için öne çıkar?`,
        answer: `Kalkan yamaçları, Kaş ve Ölüdeniz çevresi sık tercih edilir. İslamlar daha çok doğa/yayla manzarasıyla öne çıkabilir.`,
      },
      {
        question: `Yüksek sezonda manzaralı villa bulmak zor mu?`,
        answer: `Temmuz-Ağustos ve bayram dönemlerinde talep yüksektir. Erken rezervasyon veya esnek tarih avantaj sağlar.`,
      },
    ],
  };
}

function buildOzelHavuzGuide(
  siteKey: PublicSiteKey,
  brandName: string,
  place?: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const unit = unitOf(siteKey).toLocaleLowerCase("tr");
  const label = withPlace(place, "Özel Havuzlu Villalar");

  return {
    title: `${adapt(siteKey, label)} | ${brand}`,
    description: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}özel havuzlu kiralık ${unit} seçenekleri ${brand}'nda. Aile, grup ve çift tatilleri için güvenli rezervasyon.`
    ),
    h1: adapt(siteKey, `${label} ile Size Özel Tatil`),
    sectionHeading: adapt(
      siteKey,
      `${place ? `${place}'da ` : ""}özel havuzlu villa rehberi`
    ),
    paragraphs: [
      adapt(
        siteKey,
        `Özel havuz; paylaşılmayan bir yüzme alanı ve bahçe mahremiyeti demektir. ${brand} listesinde özel havuzlu ${unit} seçenekleri bu beklentiye göre filtrelenir.`
      ),
      adapt(
        siteKey,
        `Havuz boyutu, derinlik, çocuk havuzu, ısıtma ve korunaklılık villa villa değişir. Aileler çocuk güvenliğini, çiftler jakuzi ve manzarayı birlikte değerlendirebilir.`
      ),
      adapt(
        siteKey,
        `Kalkan, Fethiye, Kaş, Bodrum ve Marmaris çevresinde geniş bir özel havuzlu portföy bulunur. Takvim, kapasite ve ek ücretleri rezervasyon öncesi netleştirin.`
      ),
    ],
    faqs: [
      {
        question: `Özel havuz her zaman ısıtmalı mıdır?`,
        answer: `Hayır. Isıtma ayrı bir özelliktir. Isıtmalı veya kapalı havuz arıyorsanız ilgili filtreleri de kullanın.`,
      },
      {
        question: `Çocuklar için özel havuz güvenli midir?`,
        answer: `Derinlik, korkuluk ve çocuk havuzu villaya göre değişir. Küçük çocuklu aileler ilan detayını ve galeriyi mutlaka kontrol etmelidir.`,
      },
      {
        question: `Havuz bakımı fiyata dahil midir?`,
        answer: `Çoğu ilanda düzenli havuz bakımı operasyon tarafından sağlanır; kapsam villa ve döneme göre değişebilir. Rezervasyon koşulları esas alınır.`,
      },
      {
        question: `Muhafazakar özel havuzlu villa bulabilir miyim?`,
        answer: `Evet. Muhafazakar / korunaklı filtre ile özel havuzu dışarıdan kapatılmış seçenekleri daraltabilirsiniz.`,
      },
    ],
  };
}

function buildErkenRezervasyonGuide(
  siteKey: PublicSiteKey,
  brandName: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const year = EARLY_BOOKING_PRICE_YEAR;
  const units = unitsOf(siteKey).toLocaleLowerCase("tr");

  return {
    title: `${year} Erken Rezervasyon Fırsatları | ${brand}`,
    description: adapt(
      siteKey,
      `${year} sezonu fiyatı açıklanan kiralık ${units}. Erken rezervasyon ile istediğiniz tarihi ${brand} güvencesiyle şimdiden ayırtın.`
    ),
    h1: `${year} Yılı Erken Rezervasyon Fırsatları`,
    sectionHeading: `Erken rezervasyonla ${year} tatilinizi önden planlayın`,
    paragraphs: [
      adapt(
        siteKey,
        `Erken rezervasyon; özellikle yaz, bayram ve sömestir dönemlerinde popüler ${units} için müsaitliği korumanın en pratik yoludur. ${brand}'nda ${year} fiyatı girilmiş ilanlar bu kampanyada listelenir.`
      ),
      adapt(
        siteKey,
        `Erken ayırtmanın avantajı yalnızca tarih tutmak değildir; planlamayı bölge, kapasite ve konsept (ısıtmalı havuz, deniz manzarası, balayı) üzerinden sakinleştirir.`
      ),
      adapt(
        siteKey,
        `Ödeme planı, iptal koşulları ve minimum konaklama ilan bazında değişir. Rezervasyon özetindeki maddeler geçerlidir; esnek tarih aralığınız varsa alternatif villaları da yan yana karşılaştırın.`
      ),
    ],
    faqs: [
      {
        question: `Erken rezervasyon fiyatı garanti midir?`,
        answer: `Listelenen ${year} dönemi fiyatları ilan ve tarih aralığına göre gösterilir. Kesin tutar seçtiğiniz giriş-çıkış tarihlerinde hesaplanır.`,
      },
      {
        question: `Şimdi rezervasyon yapıp tarihi sonra değiştirebilir miyim?`,
        answer: `Değişiklik imkânı villa ve dönem koşullarına bağlıdır. Mümkün olduğunca erken talep iletin; müsaitlik garanti edilemeyebilir.`,
      },
      {
        question: `Hangi bölgeler erken rezervasyonda hızlı doluyor?`,
        answer: `Kalkan, Kaş, Fethiye–Ölüdeniz ve popüler balayı / deniz manzaralı villalar yüksek sezonda erken tükenir.`,
      },
      {
        question: `Ödeme nasıl ilerler?`,
        answer: `Genelde ön ödeme + kalan bakiye modeli uygulanır. Oranlar ilan ve kampanya koşullarına göre değişir; onay mesajındaki plan esas alınır.`,
      },
    ],
  };
}

function buildKisTatiliGuide(
  siteKey: PublicSiteKey,
  brandName: string
): TopicSeoGuide {
  const brand = brandLabel(siteKey, brandName);
  const units = unitsOf(siteKey).toLocaleLowerCase("tr");

  return {
    title: `Kış Tatili Villaları & Isıtmalı Havuz | ${brand}`,
    description: adapt(
      siteKey,
      `Kış ve ara tatil için ısıtmalı/kapalı havuzlu ${units} ${brand}'nda. Sömestir, yılbaşı ve sakin kış kaçışları için güvenli rezervasyon.`
    ),
    h1: `Kış Tatili için Villa ve Isıtmalı Havuz Seçenekleri`,
    sectionHeading: `Kış tatilinde villa konforu nasıl planlanır?`,
    paragraphs: [
      adapt(
        siteKey,
        `Kış tatili; sakin tempo, daha az kalabalık ve ısıtmalı havuz konforu arayanlar için idealdir. ${brand} üzerinden ısıtmalı veya kapalı havuzlu ${units} ile yılın serin aylarında da yüzme keyfini sürdürebilirsiniz.`
      ),
      adapt(
        siteKey,
        `Kalkan–İslamlar, Fethiye ve Kaş çevresi kış/ara tatilde sık tercih edilir. Şömine, yerden ısıtma, jakuzi ve muhafazakar düzen gibi ek konforlar ilan bazında değişir.`
      ),
      adapt(
        siteKey,
        `Sömestir ve yılbaşı haftalarında talep artar; erken rezervasyon önerilir. Yazlık beklentisini kışa taşımak yerine ısıtma ve kapalı alan olanaklarını önceliklendirin.`
      ),
    ],
    faqs: [
      {
        question: `Kışın villada üşür müyüz?`,
        answer: `Isıtma tipi villaya göre değişir (klima, yerden ısıtma, şömine vb.). Kış planında ısıtma açıklamasını ve kapalı yaşam alanlarını kontrol edin.`,
      },
      {
        question: `Kış tatilinde deniz sezonu gibi midir?`,
        answer: `Deniz ve plaj kullanımı sınırlı olabilir; asıl konfor ısıtmalı havuz, jakuzi, doğa yürüyüşü ve sakin kasaba yaşamındadır.`,
      },
      {
        question: `Hangi filtreleri kullanmalıyım?`,
        answer: `Isıtmalı havuz, kapalı havuz, jakuzi ve muhafazakar düzen kış planında en sık kullanılan filtrelerdir.`,
      },
      {
        question: `Sömestir için ne zaman rezervasyon yapılmalı?`,
        answer: `Popüler bölgeler ve ısıtmalı havuzlu villalar tatilden haftalar önce dolabilir. Tarihler netleşince erken ayırtmak en güvenli yoldur.`,
      },
    ],
  };
}

const FACILITY_BUILDERS: Record<
  string,
  (siteKey: PublicSiteKey, brandName: string, place?: string) => TopicSeoGuide
> = {
  "balayi-villalari": buildBalayiGuide,
  "isitmali-havuzlu-villalar": buildIsitmaliGuide,
  "deniz-manzarali-villalar": buildDenizManzaraGuide,
  "ozel-havuzlu-villalar": buildOzelHavuzGuide,
};

const TEMA_BUILDERS: Record<
  string,
  (siteKey: PublicSiteKey, brandName: string) => TopicSeoGuide
> = {
  "erken-rezervasyon": buildErkenRezervasyonGuide,
  "kis-tatili": buildKisTatiliGuide,
};

export const SEO_TEMA_SLUGS = Object.keys(TEMA_BUILDERS);

export function getCuratedFacilityTopicGuide(
  facilitySlug: string,
  siteKey: PublicSiteKey,
  brandName: string,
  regionName?: string
): TopicSeoGuide | null {
  const builder = FACILITY_BUILDERS[facilitySlug.trim().toLowerCase()];
  if (!builder) return null;
  return builder(siteKey, brandName, regionName?.trim() || undefined);
}

export function getCuratedTemaGuide(
  temaSlug: string,
  siteKey: PublicSiteKey,
  brandName: string
): TopicSeoGuide | null {
  const builder = TEMA_BUILDERS[temaSlug.trim().toLowerCase()];
  if (!builder) return null;
  return builder(siteKey, brandName);
}

export function topicGuideToListingSeo(
  guide: TopicSeoGuide,
  links: ListingSeoPayload["relatedLinks"]
): ListingSeoPayload {
  return {
    heading: guide.sectionHeading,
    paragraphs: guide.paragraphs,
    faqs: guide.faqs,
    relatedLinks: links,
  };
}

export function defaultFacilityTopicLinks(input: {
  siteKey: PublicSiteKey;
  facilitySlug: string;
  regionSlug?: string;
  regionName?: string;
}): ListingSeoPayload["relatedLinks"] {
  const units = unitsOf(input.siteKey).toLocaleLowerCase("tr");
  const links: ListingSeoPayload["relatedLinks"] = [
    { href: "/villalar", label: `Tüm ${units}` },
    { href: "/tema/kis-tatili", label: "Kış tatili rehberi" },
    {
      href: `/kampanyalar/${EARLY_BOOKING_PRICE_YEAR}-erken-rezervasyon`,
      label: "Erken rezervasyon",
    },
  ];
  if (input.regionSlug && input.regionName) {
    links.unshift({
      href: `/villalar?region=${encodeURIComponent(input.regionSlug)}`,
      label: `${input.regionName} ${units}`,
    });
    links.push({
      href: buildGuidePath(input.regionSlug),
      label: `${input.regionName} gezi rehberi`,
    });
  }
  for (const slug of Object.keys(FACILITY_BUILDERS)) {
    if (slug === input.facilitySlug) continue;
    links.push({
      href: buildCategoryPath(
        input.regionSlug ? `${input.regionSlug}-${slug}` : slug
      ),
      label: slug
        .replace(/-villalar$|-villalari$/i, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    });
  }
  return links.slice(0, 10);
}
