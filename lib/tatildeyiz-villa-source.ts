/**
 * Villa ↔ Tatildeyiz eşlemesi.
 * Kaynak sayfa: https://www.tatildeyiz.com.tr/{slug}
 * Sayısal tesis ID’si yerel `Villa.villaId` alanında tutulur (eski tatildeyizId).
 */

export const TATILDEYIZ_SOURCE_MISSING_MESSAGE =
  "Bu villa Tatildeyiz kaynağına bağlı değil. VillaID (Tatildeyiz tesis numarası) ve slug, Tatildeyiz/Excel import eşlemesinden gelmelidir; slug kaynak sayfayla aynı olmalı (ör. www.tatildeyiz.com.tr/{slug}).";

export type TatildeyizVillaSourceFields = {
  slug: string;
  villaId: number | null;
};

export function assertTatildeyizVillaSource(
  villa: TatildeyizVillaSourceFields
): asserts villa is TatildeyizVillaSourceFields & { villaId: number } {
  const slug = villa.slug?.trim() ?? "";
  if (!slug || villa.villaId == null) {
    throw new Error(TATILDEYIZ_SOURCE_MISSING_MESSAGE);
  }
}

export function mapTatildeyizFetchError(error: unknown, slug: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /Sayfa alınamadı \(404\)/i.test(message) ||
    /Tesis verisi bulunamadı/i.test(message) ||
    /propertyImages boş/i.test(message) ||
    /__NEXT_DATA__ bulunamadı/i.test(message)
  ) {
    return new Error(
      `Tatildeyiz kaynak sayfası bulunamadı (slug: ${slug}). Kaynak URL: www.tatildeyiz.com.tr/${slug}`
    );
  }
  return error instanceof Error ? error : new Error(message);
}
