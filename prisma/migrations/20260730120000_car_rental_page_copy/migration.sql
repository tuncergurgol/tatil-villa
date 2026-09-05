-- Sadeleştirilmiş araç kiralama sayfa metinleri
UPDATE "CarRentalPageSettings"
SET
  "heroBadge" = '',
  "heroTitle" = 'Araç Kiralamak Ne Kolaymış!',
  "heroSubtitle" = 'Ara, karşılaştır, en uygun aracı bul.',
  "rentalDaysHint" = '',
  "categoriesSubtitle" = '',
  "locationsSubtitle" = '',
  "criteriaSubtitle" = '',
  "updatedAt" = NOW()
WHERE id = 'default';
