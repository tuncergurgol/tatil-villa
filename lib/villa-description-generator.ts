import type { VillaCategory } from "@prisma/client";
import { facilityTypeLabel } from "@/lib/facility-type";
import { normalizeVillaDescriptionForStorage } from "@/lib/villa-html-content";

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

export function isFeaturedAmenityCategory(category: string) {
  return (
    category.localeCompare("Öne Çıkanlar", "tr", { sensitivity: "base" }) === 0
  );
}

export function formatDescriptionDistanceKm(km: number) {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} Metre`;
  }
  const rounded = Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1);
  return `${rounded} Km`;
}

function buildPlanLabel(bedrooms: number, livingRooms: number) {
  return `${bedrooms}+${livingRooms}`;
}

function formatDistanceLines(distances: VillaDescriptionDistance[]) {
  if (distances.length === 0) return "Belirtilmedi";
  return distances
    .map((item) => `${item.name}: ${item.distanceLabel}`)
    .join("\n");
}

function formatFeaturedLines(featuredAmenities: string[]) {
  if (featuredAmenities.length === 0) return "Belirtilmedi";
  return featuredAmenities.join(", ");
}

function formatRulesSummary(context: VillaDescriptionContext) {
  const rules: string[] = [];
  if (!context.childFriendly) rules.push("Çocuk kabul edilmez");
  if (!context.allowPets) rules.push("Evcil hayvan kabul edilmez");
  if (!context.allowSmoking) rules.push("Sigara içilmez");
  if (context.customRules.length > 0) rules.push(...context.customRules);
  return rules.length > 0 ? rules.join("; ") : "Belirtilmedi";
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

export function buildVillaDescriptionPrompt(context: VillaDescriptionContext) {
  const typeLabel = facilityTypeLabel(context.facilityType);
  const locationLine =
    [context.regionMahalle, context.regionIlce, context.regionIl]
      .filter(Boolean)
      .join(", ") ||
    context.region ||
    context.location;

  return `Türkiye'de tatil konaklama sitesi için villa açıklaması yaz.

Aşağıdaki REFERANS METİN yalnızca üslup, paragraf akışı ve anlatım tarzı için şablondur. Metni kopyalama; her villa için aşağıdaki verilere göre özgün metin üret.

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
- Öne çıkan özellikler (ÖNE ÇIKANLAR): ${formatFeaturedLines(context.featuredAmenities)}
- Diğer olanaklar: ${context.amenities.slice(0, 20).join(", ") || "Belirtilmedi"}
- Mesafeler:
${formatDistanceLines(context.distances)}
- Kurallar: ${formatRulesSummary(context)}
- Minimum konaklama: ${context.minStayNights ? `${context.minStayNights} gece` : "Belirtilmedi"}
- Ek notlar: ${context.extraInfo || "Yok"}

Kurallar:
- Türkçe yaz
- Referans şablondaki gibi 7-9 paragraflık akıcı bir metin oluştur (giriş/konum, konsept, iç mekân, dış alan/havuz, ayırt edici detay, kurallar, mesafeler/konum avantajı, kapanış SEO)
- Yalnızca verilen villa bilgilerini kullan; şablondaki özel ölçü, marka veya başka villaya ait detayları uydurma
- Öne çıkan özellikleri metnin gövdesine doğal şekilde yedir; ayrı madde listesi kullanma
- Mesafe bilgilerini konum paragrafında doğal cümlelerle geçir
- Kapasite ve plan bilgisini giriş veya konsept paragrafında belirt
- HTML formatında döndür (yalnızca <p> etiketleri; h2/ul kullanma)
- Abartılı vaatlerden kaçın, profesyonel ve ikna edici ton kullan
- Villa adını ve bölgeyi SEO için doğal biçimde geçir
- Sadece HTML içeriği döndür, açıklama veya markdown kullanma`;
}

function pickFeaturedBuckets(featuredAmenities: string[]) {
  const lower = featuredAmenities.map((item) => item.toLocaleLowerCase("tr-TR"));
  const has = (pattern: RegExp) =>
    featuredAmenities.filter((_, index) => pattern.test(lower[index] ?? ""));

  return {
    pool: has(/havuz|jakuzi|pool/i),
    interior: has(/tv|klima|mutfak|buzdolab|bulaşık|çamaşır|yatak|banyo|gardrop|vantilat/i),
    exterior: has(/şezlong|şemsiye|salıncak|kamelya|teras|bahçe|otopark|wifi|barbekü|mangal/i),
    concept: has(/kubbe|dome|glamping|ahşap|doğa|jakuzi|hidromasaj/i),
    other: featuredAmenities.filter(
      (item) =>
        !/(havuz|jakuzi|pool|tv|klima|mutfak|buzdolab|bulaşık|çamaşır|yatak|banyo|gardrop|vantilat|şezlong|şemsiye|salıncak|kamelya|teras|bahçe|otopark|wifi|barbekü|mangal|kubbe|dome|glamping|ahşap|doğa|hidromasaj)/i.test(
          item
        )
    ),
  };
}

export function generateVillaDescriptionTemplate(
  context: VillaDescriptionContext
): string {
  const typeLabel = facilityTypeLabel(context.facilityType).toLocaleLowerCase(
    "tr-TR"
  );
  const region =
    [context.regionMahalle, context.regionIlce, context.regionIl]
      .filter(Boolean)
      .join(", ") ||
    context.region ||
    context.location;
  const plan = buildPlanLabel(context.bedrooms, context.livingRooms);
  const buckets = pickFeaturedBuckets(context.featuredAmenities);
  const paragraphs: string[] = [];

  paragraphs.push(
    `<p><strong>${context.name}</strong>, ${region} bölgesinde konumlanan seçkin bir kiralık ${typeLabel} seçeneğidir. ${plan} plan düzeninde tasarlanan evimiz ${context.guests} kişilik kapasitesiyle konforlu bir konaklama sunar.</p>`
  );

  const conceptBits = [
    ...new Set([
      ...buckets.concept,
      ...buckets.pool.slice(0, 2),
      ...buckets.other.slice(0, 2),
    ]),
  ].filter(Boolean);
  if (conceptBits.length > 0) {
    paragraphs.push(
      `<p>Bu ${typeLabel}nın öne çıkan yönü ${conceptBits.join(", ")} gibi özellikleriyle misafirlere farklı bir tatil deneyimi sunmasıdır. Doğa içinde konforlu ve huzurlu bir ortam arayanlar için özenle hazırlanmıştır.</p>`
    );
  }

  const interiorBits = buckets.interior.slice(0, 8);
  if (interiorBits.length > 0) {
    paragraphs.push(
      `<p>İç mekânda misafirlerin rahatlığı için ${interiorBits.join(", ")} gibi donanımlar bulunur. ${context.bedrooms} yatak odası ve ${context.bathrooms} banyo ile düzenli bir yaşam alanı sunulur.</p>`
    );
  }

  const exteriorBits = buckets.exterior.slice(0, 8);
  if (exteriorBits.length > 0 || buckets.pool.length > 0) {
    paragraphs.push(
      `<p>Dış alanda ${[...buckets.pool, ...exteriorBits].slice(0, 8).join(", ")} gibi imkânlarla tatilin keyfini villanızda çıkarabilirsiniz.</p>`
    );
  }

  const highlight =
    buckets.other.find((item) => /kamelya|teras|manzara|jakuzi/i.test(item)) ??
    context.featuredAmenities[0];
  if (highlight) {
    paragraphs.push(
      `<p>${highlight} gibi detaylar bu ${typeLabel}yı benzer seçeneklerden ayıran önemli artılardan biridir.</p>`
    );
  }

  const rules = formatRulesSummary(context);
  if (rules !== "Belirtilmedi") {
    paragraphs.push(`<p>Konaklama kuralları: ${rules}.</p>`);
  }

  if (context.distances.length > 0) {
    const distanceText = context.distances
      .slice(0, 6)
      .map((item) => `${item.name} yaklaşık ${item.distanceLabel}`)
      .join(", ");
    paragraphs.push(
      `<p>Konum avantajı açısından ${distanceText} mesafededir. ${context.location ? `${context.location} ` : ""}çevresindeki ihtiyaç noktalarına kolay erişim sağlar.</p>`
    );
  }

  if (context.minStayNights) {
    paragraphs.push(
      `<p>Minimum konaklama süresi ${context.minStayNights} gecedir.</p>`
    );
  }

  paragraphs.push(
    `<p>${region} bölgesinde ${context.guests} kişilik kapasiteye sahip bu kiralık ${typeLabel}, ${context.featuredAmenities.slice(0, 4).join(", ") || "konforlu donanımı"} ile unutulmaz bir tatil deneyimi sunar.</p>`
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
