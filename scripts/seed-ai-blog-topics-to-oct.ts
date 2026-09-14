/**
 * Mevcut blogları inceler, 31.10.2026'ya kadar günlük üretime yetecek
 * SEO odaklı AI blog konularını ekler ve otomatik planlamayı açar.
 *
 * Production:
 *   ssh ... "cd /var/www/tatil-villa && set -a && . ./.env && set +a && npx tsx scripts/seed-ai-blog-topics-to-oct.ts"
 */
import { BlogAiPublishFrequency, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Bugün (2026-09-03) → 31.10.2026 dahil ≈ 59 gün; tamponla 65 konu. */
const TARGET_PENDING = 65;

/**
 * SEO + hizmet kapsamı: villa kiralama, bölgeler, otel, bilet, transfer,
 * araç kiralama, feribot, tur, balayı, aile, sezon/fırsat.
 * Mevcut yazılarla çakışmaması için genel/rehber odaklı başlıklar.
 */
const CANDIDATE_TOPICS: string[] = [
  // —— Hizmetler (eksik alanlar) ——
  "Villa Kiralama ile Otel Tatili Arasındaki Farklar",
  "VIP Transfer Nedir? Havalimanından Villaya Güvenli Ulaşım",
  "Tatilde Araç Kiralama Rehberi: Ne Zaman Mantıklı?",
  "Uçak ve Otobüs Bileti ile Villa Tatili Nasıl Planlanır?",
  "Feribot ile Ada ve Sahil Tatili: Pratik Ulaşım İpuçları",
  "Günübirlik Tur ve Aktivitelerle Villa Tatilinizi Zenginleştirin",
  "Otel Rezervasyonu Yaparken Dikkat Edilecekler",
  "Tek Platformdan Villa, Otel, Bilet ve Transfer Planlamak",
  "Balayı Tatili için Villa mı Otel mi? Karşılaştırma Rehberi",
  "Aile Tatilinde Villa Kiralamanın Avantajları",

  // —— Bölge rehberleri ——
  "Fethiye'de Villa Kiralama: Mahalle ve Bölge Seçim Rehberi",
  "Kalkan'da Tatil: Plajlar, Restoranlar ve Villa Bölgeleri",
  "Kaş'ta Villa Tatili: Sessiz Tatil Arayanlar İçin Rehber",
  "Bodrum'da Villa Kiralama: Popüler Bölgeler ve Sezon İpuçları",
  "Marmaris'te Villa Tatili Rehberi",
  "Datça'da Sakin Villa Tatili: Ne Yapılır, Nerede Kalınır?",
  "Ölüdeniz'de Konaklama Seçenekleri: Villa mı Otel mi?",
  "Çalış ve Hisarönü'nde Villa Tatili Rehberi",
  "Patara'da Villa Kiralama ve Uzun Plaj Tatili",
  "Dalyan'da Doğa ve Villa Tatili: Kaplumbağalar, Ilıcalar",
  "Antalya'da Villa Kiralama Rehberi",
  "Alanya'da Aile Dostu Villa Tatili",
  "Side ve Manavgat'ta Villa Konaklama İpuçları",
  "İzmir Çeşme'de Villa Tatili Planlama Rehberi",
  "Akyaka'da Sakin Tatil ve Villa Seçimi",

  // —— Villa kiralama süreç / SEO ——
  "Online Villa Rezervasyonu Nasıl Yapılır? Adım Adım Rehber",
  "Villa Kiralarken Depozito ve Temizlik Ücreti Nedir?",
  "Villa Rezervasyonunda İptal ve İade Koşulları",
  "Villa Seçerken Kapasite, Yatak Odası ve Havuz Kontrol Listesi",
  "Güvenli Villa Kiralama: Sahte İlanlardan Korunma İpuçları",
  "Erken Rezervasyon ile Villa Tatilinde Tasarruf",
  "Son Dakika Villa Fırsatları: Ne Zaman Bakılmalı?",
  "Deniz Manzaralı Villa mı Merkez Villa mı? Nasıl Karar Verilir?",
  "Isıtmalı Havuzlu Villa Kiralama Rehberi",
  "Jakuzili ve Saunal Villa Tatili Arayanlar İçin İpuçları",
  "Evcil Hayvan Kabul Eden Villalar: Rezervasyon Öncesi Bilinmesi Gerekenler",
  "Engelli Dostu Villa Seçimi ve Erişilebilir Tatil",
  "Geniş Aile ve Gruplar için Büyük Villa Kiralama",
  "Çocuklu Aileler için Villa Tatili Kontrol Listesi",
  "Balayı Villası Seçerken Nelere Bakılmalı?",

  // —— Sezon / tatil günleri / fırsat ——
  "Yaz Sezonunda Villa Kiralama: Temmuz-Ağustos Planlama İpuçları",
  "Sonbahar Tatili için Villa Kiralama Avantajları",
  "Kışın Isıtmalı Havuzlu Villa Tatili Mümkün mü?",
  "Bayram Tatilinde Villa Rezervasyonu: Erken Planlama Önerileri",
  "Okul Tatillerinde Aile Villa Tatili Nasıl Planlanır?",
  "Hafta Sonu Kaçamağı için Yakın Mesafe Villa Seçenekleri",
  "Uzun Hafta Sonu Tatili için 3 Günlük Villa Planı",

  // —— Deneyim / içerik SEO ——
  "Villa Tatilinde Market ve Mutfak Alışveriş Listesi",
  "Villa Havuz Güvenliği: Çocuklu Aileler için Kurallar",
  "Villa Tatilinde BBQ ve Açık Hava Keyfi",
  "Gece Sessizliği ve Komşuluk: Villada Konaklama Adabı",
  "Villada İnternet ve Uzaktan Çalışma: Dijital Nomad İpuçları",
  "Sürdürülebilir Villa Tatili: Su ve Enerji Tasarrufu",
  "Villa Fotoğraflarını Doğru Okumak: Gerçekçi Beklenti Oluşturma",
  "Misafir Yorumlarını Okurken Dikkat Edilecek Noktalar",

  // —— Transfer / ulaşım derinleşme ——
  "Dalaman Havalimanı'ndan Fethiye ve Kalkan'a Ulaşım Seçenekleri",
  "Bodrum Havalimanı Transferi: VIP mi Araç Kiralama mı?",
  "Antalya Havalimanı'ndan Villa Bölgelerine Nasıl Gidilir?",
  "Villaya Özel Transfer Rezervasyonu Ne Zaman Yapılmalı?",

  // —— Tur / aktivite ——
  "Fethiye'de Günübirlik Tekne Turu ve Villa Tatili Birleşimi",
  "Kaş'ta Dalış ve Villa Tatili: Aktivite Planı",
  "Saklıkent Kanyonu Gezisi ile Villa Tatilinizi Zenginleştirin",
  "Paraşüt, Jeep Safari ve Villa Tatili: Adrenalin Sevenler İçin",

  // —— Otel / bilet / araç ——
  "Villa Öncesi veya Sonrası Otel Konaklaması Ne Zaman Mantıklı?",
  "Uçak Bileti + Villa Paketi Planlama: Takvim ve Bütçe",
  "Tatilde Araç Kiralarken Sigorta ve Ek Ücretler",
  "Şehirden Köye: Otobüs Bileti ile Villa Tatiline Gitmek",

  // —— Marka / güven ——
  "Neden Profesyonel Villa Acentesi ile Rezervasyon Yapmalısınız?",
  "7/24 Destekli Villa Kiralama: Tatilde Güvenli Hizmet",
  "Komisyonlu Villa Satış Modeli Misafire Ne Kazandırır?",

  // —— Ek SEO / uzun kuyruk ——
  "Ucuz Villa Kiralama Ararken Kaliteden Ödün Vermemek",
  "Lüks Villa Tatili: Premium Konaklama Seçim Kriterleri",
  "Denize Sıfır Villa mı Yürüyüş Mesafesi mi?",
  "Villada Kahvaltı ve Self Servis Konaklama Avantajları",
  "İki Aile Birlikte Villa Tatili: Paylaşım ve Bütçe İpuçları",
  "Romantik Villa Tatili: Balayı ve Yıldönümü Fikirleri",
  "Spor ve Fitness için Villa Seçimi: Havuz ve Bahçe Alanı",
  "Fotoğraf Tutkunları için Manzaralı Villa Bölgeleri",
  "Yerel Lezzetler ve Villa Tatili: Mutfak Deneyimi",
  "Tatil Öncesi Villa Check-in ve Check-out Saatleri",
  "Villaya Giderken Bavul Listesi: Yaz ve Sonbahar",
  "İlk Kez Villa Kiralayanlar için 10 Altın Kural",
  "Tekrarlayan Misafirler için Sadakat ve Erken Rezervasyon",
  "Tatildeyiz ile Villa, Transfer ve Bilet Planlama Rehberi",
];

function normalizeTitle(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function overlapsExisting(candidate: string, existing: Set<string>) {
  const n = normalizeTitle(candidate);
  if (existing.has(n)) return true;
  for (const title of existing) {
    if (title.includes(n) || n.includes(title)) return true;
    const candWords = new Set(n.split(" ").filter((w) => w.length > 3));
    const titleWords = title.split(" ").filter((w) => w.length > 3);
    const shared = titleWords.filter((w) => candWords.has(w)).length;
    if (shared >= 4 && candWords.size <= 8) return true;
  }
  return false;
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { title: true, published: true },
  });
  const topics = await prisma.blogAiTopic.findMany({
    select: { topic: true, status: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const categories = await prisma.blogCategory.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const existing = new Set<string>();
  for (const post of posts) existing.add(normalizeTitle(post.title));
  for (const topic of topics) existing.add(normalizeTitle(topic.topic));

  const pendingCount = topics.filter((t) => t.status === "PENDING").length;
  const need = Math.max(0, TARGET_PENDING - pendingCount);

  const toAdd: string[] = [];
  for (const candidate of CANDIDATE_TOPICS) {
    if (toAdd.length >= need) break;
    if (overlapsExisting(candidate, existing)) continue;
    toAdd.push(candidate);
    existing.add(normalizeTitle(candidate));
  }

  // Yetersizse numaralı varyasyon üretme — listeyi geniş tutuyoruz
  if (toAdd.length < need) {
    console.warn(
      `Uyarı: ${need} konu gerekti, çakışmasız ${toAdd.length} bulundu. Listeyi genişletin.`
    );
  }

  const maxSort = await prisma.blogAiTopic.aggregate({
    _max: { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const defaultCategory =
    categories.find((c) => c.slug === "villa-kiralama-rehberi") ??
    categories.find((c) => c.slug === "tatil-ipuclari") ??
    categories[0] ??
    null;

  if (toAdd.length > 0) {
    await prisma.blogAiTopic.createMany({
      data: toAdd.map((topic) => ({
        topic,
        categoryId: null,
        sortOrder: sortOrder++,
        status: "PENDING" as const,
      })),
    });
  }

  const nextRunAt = new Date();
  await prisma.blogAiSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      enabled: true,
      frequency: BlogAiPublishFrequency.EVERY_1_DAY,
      autoPublish: true,
      defaultCategoryId: defaultCategory?.id ?? null,
      nextRunAt,
    },
    update: {
      enabled: true,
      frequency: BlogAiPublishFrequency.EVERY_1_DAY,
      autoPublish: true,
      defaultCategoryId: defaultCategory?.id ?? null,
      nextRunAt,
    },
  });

  const afterTopics = await prisma.blogAiTopic.findMany({
    where: { status: "PENDING" },
    orderBy: { sortOrder: "asc" },
    select: { topic: true },
  });
  const settings = await prisma.blogAiSettings.findUnique({
    where: { id: "default" },
  });

  console.log(
    JSON.stringify(
      {
        existingPosts: posts.length,
        existingTopics: topics.length,
        pendingBefore: pendingCount,
        added: toAdd.length,
        addedTopics: toAdd,
        pendingAfter: afterTopics.length,
        defaultCategory: defaultCategory
          ? { id: defaultCategory.id, name: defaultCategory.name }
          : null,
        settings,
        coversUntilApprox: (() => {
          const d = new Date();
          d.setDate(d.getDate() + afterTopics.length);
          return d.toISOString().slice(0, 10);
        })(),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
