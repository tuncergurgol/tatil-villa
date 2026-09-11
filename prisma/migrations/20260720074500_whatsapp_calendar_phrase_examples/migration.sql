-- WhatsApp takvim: yeni mesaj örnekleri (CLOSE)
INSERT INTO "WhatsappCalendarPhraseRule" ("id", "phrase", "intent", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('wphr_close_doldu', 'doldu', 'CLOSE', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_satilmistir', 'satılmıştır', 'CLOSE', true, 35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_kapatildi', 'kapatıldı', 'CLOSE', true, 36, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_kapatabilir_misiniz', 'kapatabilir misiniz', 'CLOSE', true, 37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_rezervasyon_yapilmistir', 'rezervasyon yapılmıştır', 'CLOSE', true, 38, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("phrase", "intent") DO NOTHING;
