ALTER TABLE "SiteMenuItem" ADD COLUMN "siteKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO "SiteMenuItem" (
  "id",
  "menuId",
  "label",
  "href",
  "sortOrder",
  "active",
  "openInNewTab",
  "siteKeys",
  "createdAt",
  "updatedAt"
)
SELECT
  'menu-footer-sadakat',
  m."id",
  'Sadakat Programı',
  '/sadakat',
  6,
  true,
  false,
  ARRAY['tatildeyiz', 'balayi-villacisi', 'tatil-villacisi']::TEXT[],
  NOW(),
  NOW()
FROM "SiteMenu" m
WHERE m."key" = 'footer-quick'
  AND NOT EXISTS (
    SELECT 1 FROM "SiteMenuItem" i
    WHERE i."menuId" = m."id" AND i."href" = '/sadakat'
  );

INSERT INTO "SiteMenuItem" (
  "id",
  "menuId",
  "label",
  "href",
  "sortOrder",
  "active",
  "openInNewTab",
  "siteKeys",
  "createdAt",
  "updatedAt"
)
SELECT
  'menu-footer-yeni-otel',
  m."id",
  'YENİ OTEL',
  '/yeni-otel',
  7,
  true,
  false,
  ARRAY['tatildeyiz']::TEXT[],
  NOW(),
  NOW()
FROM "SiteMenu" m
WHERE m."key" = 'footer-quick'
  AND NOT EXISTS (
    SELECT 1 FROM "SiteMenuItem" i
    WHERE i."menuId" = m."id" AND i."href" = '/yeni-otel'
  );
