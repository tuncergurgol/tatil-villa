-- Bing Webmaster (Edge/Opera/Copilot) ve Yandex Webmaster doğrulama kodları
ALTER TABLE "PublicSiteTracking"
  ADD COLUMN IF NOT EXISTS "bingWebmasterCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "yandexWebmasterCode" TEXT NOT NULL DEFAULT '';
