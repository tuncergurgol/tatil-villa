import type { PublicSiteKey } from "@/lib/public-site-keys";
import { getPublicListingCopy } from "@/lib/public-listing-copy";
import { buildCategoryPath, buildGuidePath } from "@/lib/seo-matrix";

export type ListingSeoFaq = { question: string; answer: string };

export type ListingSeoPayload = {
  heading: string;
  paragraphs: string[];
  faqs: ListingSeoFaq[];
  relatedLinks: Array<{ href: string; label: string }>;
};

function unitWord(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).singular.toLocaleLowerCase("tr");
}

function unitWordPlural(siteKey: PublicSiteKey): string {
  return getPublicListingCopy(siteKey).plural.toLocaleLowerCase("tr");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function paragraphsFromLongText(text: string, fallback: string[]): string[] {
  const clean = stripHtml(text);
  if (clean.length >= 120) {
    const chunks = clean
      .split(/(?<=\.)\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40);
    if (chunks.length >= 2) return chunks.slice(0, 5);
    return [clean.slice(0, 900)];
  }
  return fallback;
}

export function buildRegionListingSeo(input: {
  siteKey: PublicSiteKey;
  regionName: string;
  regionSlug: string;
  longDescription?: string;
  seoDescription?: string;
  villaCount: number;
  relatedFacilities?: Array<{ slug: string; name: string }>;
}): ListingSeoPayload {
  const unit = unitWord(input.siteKey);
  const units = unitWordPlural(input.siteKey);
  const name = input.regionName.trim();
  const fallback = [
    `${name} bölgesinde ${input.villaCount} aktif ${unit} seçeneği sunuyoruz. Özel havuz, deniz manzarası, balayı ve aile tatili için filtreleyerek size uygun evi hızla bulabilirsiniz.`,
    `${name} ${units} için giriş-çıkış saatleri, depozito ve minimum konaklama süresi ilan bazında değişir. Rezervasyon öncesi takvim ve iptal koşullarını kontrol etmenizi öneririz.`,
    `Aynı bölgede farklı konseptleri karşılaştırmak için ısıtmalı havuz, jakuzi veya muhafazakar düzen gibi kategori sayfalarını kullanın. Detaylı gezi ipuçları için ${name} rehberine göz atabilirsiniz.`,
  ];
  const fromCms = paragraphsFromLongText(
    input.longDescription || input.seoDescription || "",
    fallback
  );

  const faqs: ListingSeoFaq[] = [
    {
      question: `${name}'da ${unit} fiyatları neye göre değişir?`,
      answer: `Fiyatlar sezon, kişi kapasitesi, havuz tipi ve konuma göre değişir. Yüksek sezonda (özellikle Temmuz-Ağustos) gece fiyatı yükselir; erken rezervasyon ve esnek tarihlerle daha uygun seçenekler bulunabilir. Listede gördüğünüz rakamlar güncel dönem fiyatıdır.`,
    },
    {
      question: `${name} ${units} giriş ve çıkış saatleri nedir?`,
      answer: `Çoğu ilanda giriş 16:00 sonrası, çıkış 10:00 öncesidir; villa bazında farklılık olabilir. Erken check-in veya geç check-out taleplerini rezervasyon sonrası operasyon ekibiyle netleştirin.`,
    },
    {
      question: `${name}'da kimler için hangi ${unit} daha uygun?`,
      answer: `Aileler çocuk havuzlu ve bahçeli seçenekleri, çiftler jakuzili veya deniz manzaralı villaları, mahremiyet arayanlar muhafazakar düzenli evleri tercih eder. Filtrelerle kapasite ve tesis özelliklerini daraltabilirsiniz.`,
    },
    {
      question: `${name} tatilinde araç gerekli mi?`,
      answer: `Merkeze ve plaja yürüme mesafesindeki villalarda araç şart olmayabilir; yayvan yerleşimde veya koy turları planlıyorsanız araç kiralama konforu artırır. İlan mesafelerini haritadan kontrol edin.`,
    },
  ];

  const relatedLinks: ListingSeoPayload["relatedLinks"] = [
    { href: buildGuidePath(input.regionSlug), label: `${name} gezi rehberi` },
    { href: "/villalar", label: `Tüm ${units}` },
    { href: "/sik-sorulan-sorular", label: "Sık sorulan sorular" },
  ];
  for (const facility of input.relatedFacilities?.slice(0, 4) ?? []) {
    relatedLinks.push({
      href: buildCategoryPath(`${input.regionSlug}-${facility.slug}`),
      label: `${name} ${facility.name}`,
    });
  }

  return {
    heading: `${name} ${units} hakkında`,
    paragraphs: fromCms,
    faqs,
    relatedLinks,
  };
}

export function buildFacilityListingSeo(input: {
  siteKey: PublicSiteKey;
  facilityName: string;
  facilitySlug: string;
  longDescription?: string;
  villaCount: number;
  regionName?: string;
  regionSlug?: string;
}): ListingSeoPayload {
  const unit = unitWord(input.siteKey);
  const units = unitWordPlural(input.siteKey);
  const place = input.regionName?.trim();
  const titleCore = place
    ? `${place} ${input.facilityName}`
    : input.facilityName;
  const fallback = [
    `${titleCore} kategorisinde ${input.villaCount} ${unit} listeleniyor. Özelliği sağlayan evleri yan yana karşılaştırıp takvim ve kapasiteye göre seçim yapabilirsiniz.`,
    `Bu kategorideki ${units} genellikle benzer konfor beklentisine hitap eder; yine de havuz ölçüsü, bahçe ve konum villa villa değişir. İlan galerisi ve açıklamasını rezervasyon öncesi mutlaka inceleyin.`,
    place
      ? `${place} rehberi ve komşu bölgelerdeki benzer kategoriler, alternatif plan kurmanıza yardımcı olur.`
      : `Bölge filtresiyle aynı özelliği farklı destinasyonlarda da arayabilirsiniz.`,
  ];

  const faqs: ListingSeoFaq[] = [
    {
      question: `${titleCore} için ortalama fiyat aralığı nedir?`,
      answer: `Fiyatlar sezona ve villanın metrekare / konumuna göre değişir. Listede görünen gecelik veya konaklama toplamı güncel takvime göredir; net tutar seçtiğiniz tarihlerde hesaplanır.`,
    },
    {
      question: `Bu kategorideki ${units} kimler için uygundur?`,
      answer: `${input.facilityName} filtresi, bu özelliği bilinçli arayan misafirler içindir. Kapasite, oda sayısı ve ek tesisleri (jakuzi, çocuk havuzu vb.) ilan kartından doğrulayın.`,
    },
    {
      question: `Rezervasyon sonrası iptal ve değişiklik nasıl olur?`,
      answer: `İptal koşulları villa ve döneme göre değişir. Onay mesajındaki sözleşme maddeleri esas alınır; değişiklik için mümkün olan en erken iletişimi öneririz.`,
    },
  ];

  const relatedLinks: ListingSeoPayload["relatedLinks"] = [
    { href: "/villalar", label: `Tüm ${units}` },
    { href: "/blog", label: "Tatil rehberleri" },
  ];
  if (input.regionSlug && place) {
    relatedLinks.unshift({
      href: `/villalar?region=${encodeURIComponent(input.regionSlug)}`,
      label: `${place} ${units}`,
    });
    relatedLinks.push({
      href: buildGuidePath(input.regionSlug),
      label: `${place} gezi rehberi`,
    });
  }

  return {
    heading: `${titleCore} rehberi`,
    paragraphs: paragraphsFromLongText(input.longDescription || "", fallback),
    faqs,
    relatedLinks,
  };
}

export function buildGuideHubSeo(input: {
  siteKey: PublicSiteKey;
  regionName: string;
  regionSlug: string;
  longDescription?: string;
  villaCount: number;
}): ListingSeoPayload {
  const units = unitWordPlural(input.siteKey);
  const name = input.regionName;
  const fallback = [
    `${name}, villa tatili planlayanlar için plaj, koy, çarşı ve gün batımı rotalarıyla öne çıkar. Bu rehber; konaklama seçerken bakmanız gereken mesafeleri, mevsim ipuçlarını ve sık sorulan soruları özetler.`,
    `Konaklama tarafında ${input.villaCount} aktif ${units} seçeneğimiz var. Merkeze yakınlık, özel havuz, deniz manzarası veya muhafazakar düzen gibi filtrelerle listenizi daraltın.`,
    `Rehberin altındaki kategori bağlantıları, uzun kuyruk aramalarda (ısıtmalı havuz, jakuzi, çocuk havuzu) doğrudan ilgili villalara götürür.`,
  ];

  return {
    heading: `${name} gezi ve villa rehberi`,
    paragraphs: paragraphsFromLongText(input.longDescription || "", fallback),
    faqs: [
      {
        question: `${name}'da en iyi dönem hangisi?`,
        answer: `Mayıs-Haziran ve Eylül-Ekim dengeli hava ve daha sakin yoğunluk sunar. Temmuz-Ağustos deniz sezonunun zirvesidir; kış ve ara tatilde ısıtmalı veya kapalı havuzlu villalar öne çıkar.`,
      },
      {
        question: `${name}'da gezilecek yerlere nasıl ulaşılır?`,
        answer: `Merkez ve ana plajlara yakın villalarda yürüyüş yeterli olabilir. Koy turları, çevredeki beldeler veya market alışverişi için araç kiralama pratiktir.`,
      },
      {
        question: `Hangi ${units} ${name} için önerilir?`,
        answer: `Aileler bahçeli ve çocuk havuzlu, çiftler manzaralı ve jakuzili, kalabalık gruplar yüksek kapasiteli özel havuzlu villaları tercih eder. Liste sayfasından özellik filtresi uygulayın.`,
      },
    ],
    relatedLinks: [
      {
        href: `/villalar?region=${encodeURIComponent(input.regionSlug)}`,
        label: `${name} ${units}`,
      },
      { href: "/blog", label: "Blog yazıları" },
      { href: "/sizi-arayalim", label: "Sizi arayalım" },
    ],
  };
}
