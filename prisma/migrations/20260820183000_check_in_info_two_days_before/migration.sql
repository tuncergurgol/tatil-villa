-- Giriş bilgilendirme (11.1 misafir + 40.1 karşılayan): 1 gün önce → 2 gün önce 10:00
UPDATE "AgencyMessageTemplate" SET
  "name" = 'Tatilden 2 Gün Önce Rezervasyon Bilgi',
  "scheduleTiming" = 'Girişten 2 Gün Önce Saat: 10:00',
  "scheduleEnabled" = true,
  "scheduleAnchor" = 'check_in',
  "scheduleOffsetDays" = -2,
  "scheduleHour" = 10,
  "scheduleMinute" = 0
WHERE "rowNo" IN (111, 401) AND "active" = true;
