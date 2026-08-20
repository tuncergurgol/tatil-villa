import type { VillaCategory } from "@prisma/client";
import { sortAmenityNamesTr } from "@/lib/amenity-featured";
import { facilityTypeLabel } from "@/lib/facility-type";
import { normalizeVillaDescriptionForStorage } from "@/lib/villa-html-content";

/** Üslup ve paragraf akışı referansı — metin kopyalanmaz, yalnızca ton için kullanılır. */
export const VILLA_DESCRIPTION_STYLE_TEMPLATE = `Kalkanın en özel doğa rotalarından biri olan İslamlar Köyünde yer alan bu kubbe konsept villalar balayı tatilini sıradanlıktan çıkarıp bambaşka bir atmosfere taşımak isteyen çiftler için hazırlanmış seçkin bir kiralık villa konseptidir. KAŞ DOMES İSLAMLAR KÖYÜ etabımızda bulunan toplam 5 adet kubbe villamız 1+0 plan düzeninde tasarlanmış olup 2 kişilik kapasitesiyle çiftlere özel bir villa kiralama deneyimi sunar.

Bu tesisin farkı yalnızca özel havuzlu olması değil; glamping kültürünü gerçek bir mimari konseptle birleştirmesidir. Türkiyede ilk defa bu ölçekte üretilen kubbe villalarımız 7 metre çapında 4.30 metre kubbe yüksekliğinde ve toplam 38 m ahşap yapıda inşa edilmiştir. doğa içinde olmasına rağmen güvenlik ve iklim şartları gözetilerek tasarlandığı için konaklama boyunca konfor ve huzur aynı anda yaşanır. ayrıca her villanın ayrı havuz terasına sahip olması tatilinizi tamamen size ait hale getirir.

İç mekanda balayı çiftlerinin rahatlığı için her detay düşünülmüştür. 2 kişilik yatak oturma alanı 2 koltuk ve sehpa makyaj masası küçük yemek masası Akıllı TV ve uydu yayını açık gardrop klima ve uzaktan kumandalı tavan vantilatörü standart olarak mevcuttur. güvenlik için yangın söndürme tüpü de bulunur. mutfak bölümünde ise çamaşır bulaşık makinesi 114 litrelik mini buzdolabı mikrodalga fırın ankastre ocak davlumbaz ve yeterli mutfak ekipmanları yer alır buklet malzemeleri şampuan saç kremi sabun vb tek seferlik olarak hazırlanır.

Dış alanda ise domes konseptinin en keyifli tarafı başlar. özel yüzme havuzu 6 m x 3 m ölçülerinde ve 1.35 m derinliğe sahiptir. basamaklı girişe sahip havuzun oturak alanlarında hidromasaj jakuzi bulunur. üstelik uzaktan kumanda ile hem hidromasaj sistemini hem de havuz ışıklarını kontrol edebilmeniz bu özel konsepti dahada ayrıcalıklı hale getirir. Havuz terasında şezlonglar şemsiye salıncak geniş yemek masası sandalyeler ve oturma alanları standarttır.

Bu villayı diğer domes seçeneklerinden ayıran en özel detay ise havuz terasında yer alan göz alıcı kamelya alanıdır. Gün içinde gölgede dinlenmek akşam saatlerinde doğanın sessizliğinde keyif yapmak isteyen misafirler için kamelya tatilin en çok kullanılan ve en sevilen bölümüne dönüşür. balayı villasında romantik bir atmosfer arayan çiftler için bu detay gerçek bir artı değer yaratır.

Tesisimiz konsept gereği sadece yetişkinlere açıktır ve çocuk kabul edilmemektedir. Ayrıca doğa içinde ve ahşap yapı konsepti nedeniyle mangal ve barbekü yapmak yasaktır ancak misafirlerimizin bu keyfi yaşayabilmesi adına her villada küçük tüplü mangal bulunur ve yalnızca bu ekipmanla barbekü yapılabilmektedir.

Konum olarak Kalkan merkeze yakınlığıyla da avantajlıdır. Villalarımız Kalkan şehir merkezine yaklaşık 7 km uzaklıktadır ve araçla 8 10 dakika mesafededir. İslamlar Köyü merkezine ise yaklaşık 1.5 km uzaklıktadır. market ve çevredeki restoranlardan paket servisle alışveriş yapılabildiği için tatilinizi villadan çıkmadan da rahatlıkla planlayabilirsiniz. Dış alanda açık özel otopark ve WiFi internet bağlantısı mevcuttur No5 villada özel otopark bulunmaktadır

Minimum konaklama süresi 3 gece olup Bu yönüyle hem konsept hem de hizmet kolaylığı açısından oldukça avantajlıdır.

Kalkan İslamlarda doğa içinde özel havuzlu, jakuzili ve çiftlere özel bir balayı villa arayan misafirler için bu kubbe konsept kiralık villa hem mahremiyet sunan yapısıyla korunaklı villa beklentisini karşılar hemde konseptiyle unutulmaz bir villa kiralama tatili sunar özellikle kamelyalı havuz terasıyla romantik ve ayrıcalıklı bir atmosfer isteyenler için çok güçlü bir seçenektir.`;

export type VillaDescriptionDistance = {
  category: string;
  name: string;
  distanceLabel: string;
};

export interface VillaDescriptionContext {
  name: string;
  region: string;
  regionMahalle: string;
  regionIlce: string;
  regionIl: string;
  extraInfo: string;
  facilityType: VillaCategory;
  guests: number;
  extraCapacity: number;
  livingRooms: number;
  bedrooms: number;
  bathrooms: number;
  amenityCount: number;
  childFriendly: boolean;
  allowPets: boolean;
  allowSmoking: boolean;
  customRules: string[];
  minStayNights: number | null;
  featuredAmenities: string[];
  amenities: string[];
  location: string;
  distances: VillaDescriptionDistance[];
}

export type VillaDescriptionPreview = {
  capacitySummary: string;
  locationSummary: string;
  featuredAmenities: string[];
  distances: VillaDescriptionDistance[];
  rulesSummary: string;
  minStayNights: number | null;
  warnings: string[];
};

type FeaturedBuckets = {
  pool: string[];
  spa: string[];
  interior: string[];
  kitchen: string[];
  exterior: string[];
  standout: string[];
  other: string[];
};

export { isFeaturedAmenityCategory } from "@/lib/amenity-featured";

export function formatDescriptionDistanceKm(km: number) {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} metre`;
  }
  const rounded = Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1);
  return `${rounded} km`;
}

function buildPlanLabel(bedrooms: number, livingRooms: number) {
  return `${bedrooms}+${livingRooms}`;
}

function joinNatural(items: string[]): string {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0]!;
  if (cleaned.length === 2) return `${cleaned[0]} ve ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")} ve ${cleaned[cleaned.length - 1]}`;
}

function buildLocationLabel(context: VillaDescriptionContext) {
  return (
    [context.regionMahalle, context.regionIlce, context.regionIl]
      .filter(Boolean)
      .join(", ") ||
    context.region ||
    context.location
  );
}

function buildCapacitySummary(context: VillaDescriptionContext) {
  const plan = buildPlanLabel(context.bedrooms, context.livingRooms);
  const capacity =
    context.extraCapacity > 0
      ? `${context.guests} kişi (+${context.extraCapacity} ekstra kapasite)`
      : `${context.guests} kişi`;
  const rooms = [
    context.livingRooms > 0 ? `${context.livingRooms} salon` : null,
    `${context.bedrooms} yatak odası`,
    `${context.bathrooms} banyo`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${plan} plan, ${capacity}, ${rooms}`;
}

export function buildRulesSummary(context: VillaDescriptionContext) {
  const rules: string[] = [];
  if (!context.childFriendly) rules.push("çocuk kabul edilmez");
  if (!context.allowPets) rules.push("evcil hayvan kabul edilmez");
  if (!context.allowSmoking) rules.push("sigara içilmez");
  if (context.customRules.length > 0) rules.push(...context.customRules);
  return rules.length > 0 ? rules.join("; ") : "";
}

function formatDistanceLines(distances: VillaDescriptionDistance[]) {
  if (distances.length === 0) return "Belirtilmedi";
  return distances
    .map((item) => `${item.category} / ${item.name}: ${item.distanceLabel}`)
    .join("\n");
}

function formatFeaturedLines(featuredAmenities: string[]) {
  if (featuredAmenities.length === 0) return "Belirtilmedi";
  return sortAmenityNamesTr(featuredAmenities).join(", ");
}

function categorizeFeaturedAmenities(featured: string[]): FeaturedBuckets {
  const buckets: FeaturedBuckets = {
    pool: [],
    spa: [],
    interior: [],
    kitchen: [],
    exterior: [],
    standout: [],
    other: [],
  };

  for (const item of featured) {
    const lower = item.toLocaleLowerCase("tr-TR");
    if (/kamelya|manzara|kubbe|dome|glamping|konsept/i.test(lower)) {
      buckets.standout.push(item);
    } else if (/havuz|pool/i.test(lower)) {
      buckets.pool.push(item);
    } else if (/jakuzi|hidromasaj|spa/i.test(lower)) {
      buckets.spa.push(item);
    } else if (
      /mutfak|buzdolab|bulaşık|çamaşır|ocak|fırın|mikrodalga|davlumbaz|buklet/i.test(
        lower
      )
    ) {
      buckets.kitchen.push(item);
    } else if (
      /tv|klima|yatak|banyo|gardrop|vantilat|oturma|koltuk|sehpa/i.test(lower)
    ) {
      buckets.interior.push(item);
    } else if (
      /şezlong|şemsiye|salıncak|teras|bahçe|otopark|wifi|barbekü|mangal|ışık/i.test(
        lower
      )
    ) {
      buckets.exterior.push(item);
    } else {
      buckets.other.push(item);
    }
  }

  return buckets;
}

function pickStandoutFeature(buckets: FeaturedBuckets, featured: string[]) {
  return (
    buckets.standout[0] ??
    buckets.spa[0] ??
    buckets.exterior.find((item) => /kamelya|salıncak|teras/i.test(item)) ??
    featured.find((item) => /kamelya|jakuzi|manzara|kubbe|dome/i.test(item)) ??
    featured[0] ??
    null
  );
}

function buildDistanceParagraph(
  distances: VillaDescriptionDistance[],
  locationNote: string
) {
  if (distances.length === 0) return "";

  const phrases = distances
    .slice(0, 8)
    .map((item) => `${item.name} yaklaşık ${item.distanceLabel}`);

  const locationTail = locationNote.trim()
    ? ` ${locationNote.trim()}`
    : " Çevredeki market ve restoranlara kolay erişim sayesinde tatilinizi villadan çıkmadan da rahatlıkla planlayabilirsiniz.";

  return `Konum olarak ${joinNatural(phrases)} mesafededir.${locationTail}`;
}

function buildSeoKeywords(context: VillaDescriptionContext, typeLabel: string) {
  const location = buildLocationLabel(context);
  const keywords = [
    `${location} kiralık ${typeLabel}`,
    `${context.guests} kişilik kiralık villa`,
    context.featuredAmenities
      .filter((item) => /havuz|jakuzi|doğa|balayı/i.test(item))
      .slice(0, 2)
      .join(", "),
  ].filter(Boolean);

  return joinNatural(keywords);
}

export function buildVillaDescriptionPreview(
  context: VillaDescriptionContext
): VillaDescriptionPreview {
  const warnings: string[] = [];

  if (context.featuredAmenities.length === 0) {
    warnings.push(
      "Öne çıkan özellik bulunamadı. Olanaklar sekmesinde “Öne Çıkanlar” grubuna özellik ekleyin."
    );
  }
  if (context.distances.length === 0) {
    warnings.push(
      "Mesafe bilgisi yok. Konum & Çevre sekmesinden mesafeleri kaydedin."
    );
  }
  if (!buildLocationLabel(context)) {
    warnings.push("Bölge veya konum bilgisi eksik görünüyor.");
  }

  return {
    capacitySummary: buildCapacitySummary(context),
    locationSummary: buildLocationLabel(context),
    featuredAmenities: context.featuredAmenities,
    distances: context.distances,
    rulesSummary: buildRulesSummary(context),
    minStayNights: context.minStayNights,
    warnings,
  };
}

export function buildVillaDescriptionPrompt(context: VillaDescriptionContext) {
  const typeLabel = facilityTypeLabel(context.facilityType);
  const locationLine = buildLocationLabel(context);
  const seoHint = buildSeoKeywords(context, typeLabel.toLocaleLowerCase("tr-TR"));

  return `Türkiye'de tatil konaklama sitesi için SEO uyumlu, sıcak ve yalın dille villa açıklaması yaz.

Aşağıdaki REFERANS METİN yalnızca üslup, paragraf akışı ve anlatım tarzı için şablondur. Metni kopyalama; her villa için aşağıdaki verilere göre tamamen özgün metin üret.

--- REFERANS ŞABLON (üslup ve yapı) ---
${VILLA_DESCRIPTION_STYLE_TEMPLATE}
--- REFERANS ŞABLON SONU ---

VİLLA VERİLERİ:
- Villa adı: ${context.name}
- Konum (mahalle / ilçe / il): ${locationLine}
- Bölge özeti: ${context.region || context.location}
- Adres / konum notu: ${context.location || "Belirtilmedi"}
- Ev tipi: ${typeLabel}
- Kapasite ve plan: ${buildCapacitySummary(context)}
- Öne çıkan özellikler (ÖNE ÇIKANLAR — metnin ana donanım kaynağı): ${formatFeaturedLines(context.featuredAmenities)}
- Diğer olanaklar (yalnızca gerekirse, az kullan): ${context.amenities.slice(0, 12).join(", ") || "Yok"}
- Mesafeler:
${formatDistanceLines(context.distances)}
- Kurallar: ${buildRulesSummary(context) || "Belirtilmedi"}
- Minimum konaklama: ${context.minStayNights ? `${context.minStayNights} gece` : "Belirtilmedi"}
- Ek notlar: ${context.extraInfo || "Yok"}

Yazım kuralları:
- Türkçe, sıcak, samimi ama profesyonel bir dil kullan
- Referans şablondaki gibi 7-9 paragraflık akıcı metin yaz:
  1) Giriş: konum + villa adı + kapasite/plan
  2) Konsept ve fark yaratan yön (öne çıkan özelliklerden)
  3) İç mekân donanımı (öne çıkanlardan)
  4) Dış alan / havuz / teras (öne çıkanlardan)
  5) Villayı ayıran özel detay (kamelya, jakuzi, manzara vb.)
  6) Konaklama kuralları (varsa)
  7) Konum avantajı ve mesafeler (doğal cümlelerle)
  8) Minimum konaklama (varsa)
  9) SEO kapanış: ${seoHint}
- Öne çıkan özellikleri metnin gövdesine doğal şekilde yedir; madde listesi kullanma
- Mesafe bilgilerini “yaklaşık X km/metre” şeklinde akıcı cümlelerle geçir
- Yalnızca verilen villa bilgilerini kullan; şablondaki ölçü, marka veya başka villaya ait detayları uydurma
- Abartılı vaatlerden kaçın; okuyucuya güven veren, yalın bir anlatım tercih et
- HTML formatında döndür (yalnızca <p> etiketleri; h2/ul/li kullanma)
- Villa adını, bölgeyi ve “kiralık villa” ifadesini SEO için doğal biçimde geçir
- Sadece HTML içeriği döndür; açıklama, markdown veya kod bloğu kullanma`;
}

export function generateVillaDescriptionTemplate(
  context: VillaDescriptionContext
): string {
  const typeLabel = facilityTypeLabel(context.facilityType).toLocaleLowerCase(
    "tr-TR"
  );
  const location = buildLocationLabel(context);
  const plan = buildPlanLabel(context.bedrooms, context.livingRooms);
  const buckets = categorizeFeaturedAmenities(context.featuredAmenities);
  const standout = pickStandoutFeature(buckets, context.featuredAmenities);
  const paragraphs: string[] = [];

  const audience =
    context.guests <= 2 && !context.childFriendly
      ? "çiftlere özel bir konaklama deneyimi"
      : `${context.guests} kişilik konforlu bir konaklama deneyimi`;

  paragraphs.push(
    `<p><strong>${context.name}</strong>, ${location} bölgesinde yer alan seçkin bir kiralık ${typeLabel} seçeneğidir. ${plan} plan düzeninde tasarlanan evimiz ${context.guests} kişilik kapasitesiyle ${audience} sunar.</p>`
  );

  const conceptBits = [
    ...buckets.standout,
    ...buckets.pool,
    ...buckets.spa,
    ...buckets.other,
  ].slice(0, 4);

  if (conceptBits.length > 0) {
    paragraphs.push(
      `<p>Bu ${typeLabel}nın öne çıkan yönü, ${joinNatural(conceptBits)} gibi özellikleriyle misafirlere sıradan bir tatilden öte, özenle planlanmış bir atmosfer sunmasıdır. Doğayla iç içe konfor arayanlar için her detay düşünülmüştür.</p>`
    );
  }

  const interiorBits = [...buckets.interior, ...buckets.kitchen].slice(0, 8);
  if (interiorBits.length > 0) {
    paragraphs.push(
      `<p>İç mekânda misafirlerin rahatlığı için ${joinNatural(interiorBits)} gibi donanımlar bulunur. ${context.bedrooms} yatak odası ve ${context.bathrooms} banyo ile düzenli, ferah bir yaşam alanı sunulur.</p>`
    );
  }

  const exteriorBits = [
    ...buckets.pool,
    ...buckets.spa,
    ...buckets.exterior,
  ].slice(0, 8);
  if (exteriorBits.length > 0) {
    paragraphs.push(
      `<p>Dış alanda ${joinNatural(exteriorBits)} gibi imkânlarla tatilin keyfini villanızda çıkarabilirsiniz. Özel alanlar sayesinde konaklamanız boyunca mahremiyet ve huzur bir arada yaşanır.</p>`
    );
  }

  if (standout) {
    paragraphs.push(
      `<p>${standout}, bu ${typeLabel}yı benzer seçeneklerden ayıran önemli detaylardan biridir. Gün içinde dinlenmek veya akşam saatlerinde keyifli vakit geçirmek isteyen misafirler için gerçek bir artı değer yaratır.</p>`
    );
  }

  const rules = buildRulesSummary(context);
  if (rules) {
    paragraphs.push(
      `<p>Konaklama kuralları kapsamında ${rules}. Lütfen rezervasyon öncesi kuralları gözden geçirin.</p>`
    );
  }

  const distanceParagraph = buildDistanceParagraph(
    context.distances,
    context.location
  );
  if (distanceParagraph) {
    paragraphs.push(`<p>${distanceParagraph}</p>`);
  }

  if (context.minStayNights) {
    paragraphs.push(
      `<p>Minimum konaklama süresi ${context.minStayNights} gecedir. Bu yönüyle planlı ve konforlu bir tatil için uygun bir seçenektir.</p>`
    );
  }

  const seoBits = context.featuredAmenities.slice(0, 4);
  paragraphs.push(
    `<p>${location} bölgesinde ${context.guests} kişilik kapasiteye sahip bu kiralık ${typeLabel}, ${joinNatural(seoBits) || "konforlu donanımı"} ile unutulmaz bir villa kiralama deneyimi sunar. ${context.name} arayan misafirler için hem konumu hem de sunduğu imkânlar açısından güçlü bir tercihtir.</p>`
  );

  const extra = context.extraInfo.trim()
    ? `<p>${context.extraInfo.trim()}</p>`
    : "";

  return `${paragraphs.join("")}${extra}`;
}

export function parseVillaDescriptionAiResponse(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const htmlMatch = trimmed.match(/<[\s\S]+>/);
  if (htmlMatch) {
    return normalizeVillaDescriptionForStorage(htmlMatch[0].trim());
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block}</p>`)
    .join("");

  return paragraphs
    ? normalizeVillaDescriptionForStorage(paragraphs)
    : null;
}
