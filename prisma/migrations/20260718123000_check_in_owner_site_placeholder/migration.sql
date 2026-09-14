-- Villa yetkilisine giden giriş bilgilendirme mesajındaki eski sabit
-- Tatildeyiz alanını rezervasyonun Site Bilgisi değişkenine çevirir.
UPDATE "AgencyMessageTemplate"
SET
  "whatsappBody" = REPLACE(
    "whatsappBody",
    'tatildeyiz.com.tr',
    '##FİRMAADI##'
  ),
  "mailBody" = REPLACE(
    "mailBody",
    'tatildeyiz.com.tr',
    '##FİRMAADI##'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "rowNo" = 401
  AND (
    "whatsappBody" LIKE '%tatildeyiz.com.tr%'
    OR "mailBody" LIKE '%tatildeyiz.com.tr%'
  );
