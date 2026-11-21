-- Site başına Analytics / GSC / script ayarları

CREATE TABLE "PublicSiteTracking" (
    "id" TEXT NOT NULL,
    "siteKey" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "googleAnalyticsId" TEXT NOT NULL DEFAULT '',
    "googleAdsId" TEXT NOT NULL DEFAULT '',
    "microsoftClarityId" TEXT NOT NULL DEFAULT '',
    "googleTagManagerId" TEXT NOT NULL DEFAULT '',
    "facebookPixelId" TEXT NOT NULL DEFAULT '',
    "googleSearchConsoleCode" TEXT NOT NULL DEFAULT '',
    "headScripts" TEXT NOT NULL DEFAULT '',
    "bodyScripts" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSiteTracking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicSiteTracking_siteKey_key" ON "PublicSiteTracking"("siteKey");

-- Tatildeyiz: mevcut CompanySettings analytics alanlarından kopyala
INSERT INTO "PublicSiteTracking" (
  "id",
  "siteKey",
  "domain",
  "label",
  "googleAnalyticsId",
  "googleAdsId",
  "microsoftClarityId",
  "googleTagManagerId",
  "facebookPixelId",
  "googleSearchConsoleCode",
  "headScripts",
  "bodyScripts",
  "createdAt",
  "updatedAt"
)
SELECT
  'pst_tatildeyiz',
  'tatildeyiz',
  COALESCE(NULLIF(TRIM("domain"), ''), 'www.tatildeyiz.com.tr'),
  'Tatildeyiz',
  "googleAnalyticsId",
  "googleAdsId",
  "microsoftClarityId",
  "googleTagManagerId",
  "facebookPixelId",
  "googleSearchConsoleCode",
  "headScripts",
  "bodyScripts",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CompanySettings"
WHERE "id" = 'default';

INSERT INTO "PublicSiteTracking" (
  "id", "siteKey", "domain", "label",
  "googleAnalyticsId", "googleAdsId", "microsoftClarityId",
  "googleTagManagerId", "facebookPixelId", "googleSearchConsoleCode",
  "headScripts", "bodyScripts", "createdAt", "updatedAt"
)
VALUES
  (
    'pst_balayi_villacisi',
    'balayi-villacisi',
    'www.balayivillacisi.com',
    'Balayı Villacısı',
    '', '', '', '', '', '', '', '',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'pst_tatil_villacisi',
    'tatil-villacisi',
    'www.tatilvillacisi.com',
    'Tatil Villacısı',
    '', '', '', '', '', '', '', '',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("siteKey") DO NOTHING;

-- CompanySettings satırı yoksa Tatildeyiz varsayılanı
INSERT INTO "PublicSiteTracking" (
  "id", "siteKey", "domain", "label",
  "googleAnalyticsId", "googleAdsId", "microsoftClarityId",
  "googleTagManagerId", "facebookPixelId", "googleSearchConsoleCode",
  "headScripts", "bodyScripts", "createdAt", "updatedAt"
)
VALUES (
  'pst_tatildeyiz',
  'tatildeyiz',
  'www.tatildeyiz.com.tr',
  'Tatildeyiz',
  'G-5PDN00BR9S', '', '', '', '', '', '', '',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("siteKey") DO NOTHING;
