export type BlogGenerationContext = {
  topic: string;
  categoryName?: string | null;
};

export type BlogGenerationResult = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  coverImagePrompt: string;
};

export const BLOG_MIN_WORD_COUNT = 480;
export const BLOG_TARGET_WORD_COUNT = 500;

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function stripCodeFence(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function countWordsInHtml(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

export function buildBlogGenerationPrompt(
  context: BlogGenerationContext,
  options?: { emphasizeWordCount?: boolean }
) {
  const categoryLine = context.categoryName
    ? `Kategori: ${context.categoryName}`
    : "Kategori: Genel tatil / villa kiralama";

  const wordCountNote = options?.emphasizeWordCount
    ? `\n- content alanı kesinlikle en az ${BLOG_MIN_WORD_COUNT} kelime olsun; kısa yazma`
    : "";

  return `Türkiye'de villa kiralama ve tatil konaklama sitesi (Tatildeyiz) için SEO uyumlu, zengin içerikli bir blog yazısı üret.

Konu: ${context.topic}
${categoryLine}

Kurallar:
- Türkçe yaz
- Tatil, villa kiralama, bölge rehberi veya tatil ipuçları odağında kal
- Doğal, bilgilendirici ve profesyonel ton; abartılı vaatlerden kaçın
- content alanı HTML formatında olsun (yalnızca p, h2, h3, ul, li, strong kullan)
- content yapısı: güçlü giriş paragrafı + en az 4 h2 bölümü + en az 1 h3 alt başlık + en az 2 madde listesi (ul/li)
- content toplamı en az ${BLOG_TARGET_WORD_COUNT} kelime olsun (HTML etiketleri hariç)${wordCountNote}
- Anahtar kelimeyi başlık, ilk paragraf ve en az bir h2 içinde doğal şekilde geçir
- excerpt: 2-3 cümle, okuyucuyu içeriğe çeken özet (120-180 karakter)
- slug: URL dostu, küçük harf, tire ile ayrılmış (Türkçe karakter kullanma)
- seoTitle: en fazla 60 karakter, anahtar kelime içersin
- seoDescription: en fazla 155 karakter, tıklama oranını artıracak özet
- seoKeywords: virgülle ayrılmış 8-12 anahtar kelime (bölge + villa kiralama + konu)
- coverImagePrompt: kapak görseli için İngilizce, kısa DALL-E prompt (metin/yazı olmasın)

Yanıtı yalnızca aşağıdaki JSON formatında ver:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "content": "<p>...</p>",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "coverImagePrompt": "..."
}`;
}

export function parseBlogAiResponse(content: string): BlogGenerationResult | null {
  const cleaned = stripCodeFence(content);
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as Partial<BlogGenerationResult>;
    if (!parsed.title?.trim() || !parsed.content?.trim()) return null;

    return {
      title: parsed.title.trim(),
      slug: (parsed.slug ?? parsed.title).trim().toLowerCase(),
      excerpt: parsed.excerpt?.trim() ?? "",
      content: parsed.content.trim(),
      seoTitle: truncate(parsed.seoTitle?.trim() ?? parsed.title.trim(), 60),
      seoDescription: truncate(
        parsed.seoDescription?.trim() ?? parsed.excerpt?.trim() ?? "",
        155
      ),
      seoKeywords: parsed.seoKeywords?.trim() ?? "",
      coverImagePrompt:
        parsed.coverImagePrompt?.trim() ||
        `Beautiful Mediterranean vacation rental scene related to ${parsed.title}`,
    };
  } catch {
    return null;
  }
}

export function generateBlogTemplate(
  context: BlogGenerationContext
): BlogGenerationResult {
  const title = context.topic.trim();
  const slug = title
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const excerpt = `${title} hakkında villa kiralama ve tatil planlaması için pratik bilgiler.`;
  const content = [
    `<p><strong>${title}</strong> konusunda tatil planı yaparken dikkat etmeniz gereken temel noktaları bu yazıda derledik. Konforlu bir konaklama deneyimi için erken rezervasyon, bölge seçimi ve konaklama tipi kararları önemlidir.</p>`,
    `<h2>Neden Bu Konu Önemli?</h2>`,
    `<p>Tatil döneminde doğru planlama hem bütçenizi korur hem de konaklama kalitesini artırır. Özellikle popüler bölgelerde erken hareket etmek size daha geniş seçenek sunar.</p>`,
    `<h2>Pratik Öneriler</h2>`,
    `<ul><li>Konaklama kapasitesini misafir sayınıza göre belirleyin</li><li>Bölgeye yakın aktiviteleri önceden araştırın</li><li>İptal koşullarını ve giriş-çıkış saatlerini kontrol edin</li><li>Sezon dışı tarihlerde fırsatları değerlendirin</li></ul>`,
    `<p>Detaylı villa seçenekleri ve güncel fiyatlar için Tatildeyiz üzerinden arama yapabilirsiniz.</p>`,
  ].join("");

  return {
    title,
    slug: slug || "blog-yazisi",
    excerpt,
    content,
    seoTitle: truncate(`${title} | Tatildeyiz Blog`, 60),
    seoDescription: truncate(excerpt, 155),
    seoKeywords: `${title}, villa kiralama, tatil rehberi, Tatildeyiz`,
    coverImagePrompt: `Professional travel blog cover, Mediterranean villa vacation, ${title}`,
  };
}
