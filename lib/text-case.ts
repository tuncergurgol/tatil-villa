/**
 * Ad Soyad alanları için tek kelimelik normalizasyon kuralı:
 * her kelimenin ilk harfi büyük, kalan harfleri küçük.
 *
 * Türkçe'de İ/I ve ı/i çiftleri birbirinden farklı davrandığı için
 * (örn. "yılmaz" -> "Yılmaz", "İZMİR" -> "İzmir") standart
 * toUpperCase/toLowerCase yerine "tr-TR" locale'i kullanılır.
 */

const TR_LOCALE = "tr-TR";
const WORD_SEPARATOR_PATTERN = /([-'])/;

function capitalizeSegment(segment: string): string {
  if (!segment) return segment;
  const first = segment.slice(0, 1).toLocaleUpperCase(TR_LOCALE);
  const rest = segment.slice(1).toLocaleLowerCase(TR_LOCALE);
  return `${first}${rest}`;
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word
    .split(WORD_SEPARATOR_PATTERN)
    .map((part) => (part === "-" || part === "'" ? part : capitalizeSegment(part)))
    .join("");
}

/**
 * "mehmet ALİ  yılmaz" -> "Mehmet Ali Yılmaz"
 * Boşlukları sadeleştirir, her kelimeyi (tire/kesme işaretiyle ayrılan
 * alt parçalar dahil) ilk harf büyük - kalanı küçük biçimine çevirir.
 */
export function toProperCaseName(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.split(" ").map(capitalizeWord).join(" ");
}
