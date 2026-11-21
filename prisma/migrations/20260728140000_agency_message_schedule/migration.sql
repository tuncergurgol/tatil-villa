-- Mesaj şablonu zamanlama alanları + otomatik gönderim logu
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleTiming" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleAnchor" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleOffsetDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleHour" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "AgencyMessageTemplate" ADD COLUMN IF NOT EXISTS "scheduleMinute" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "AgencyMessageTemplate_scheduleEnabled_scheduleHour_idx"
  ON "AgencyMessageTemplate"("scheduleEnabled", "scheduleHour");

ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "scheduledBookingMessagesEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "BookingScheduledMessageLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "templateRowNo" INTEGER NOT NULL,
    "channels" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingScheduledMessageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingScheduledMessageLog_bookingId_templateRowNo_key"
  ON "BookingScheduledMessageLog"("bookingId", "templateRowNo");
CREATE INDEX IF NOT EXISTS "BookingScheduledMessageLog_templateRowNo_sentAt_idx"
  ON "BookingScheduledMessageLog"("templateRowNo", "sentAt");

ALTER TABLE "BookingScheduledMessageLog" DROP CONSTRAINT IF EXISTS "BookingScheduledMessageLog_bookingId_fkey";
ALTER TABLE "BookingScheduledMessageLog" ADD CONSTRAINT "BookingScheduledMessageLog_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zamanlanmış şablonlar (mevcut kayıtları güncelle)
UPDATE "AgencyMessageTemplate" SET
  "scheduleTiming" = 'Girişten 1 Gün Önce Saat: 10:00',
  "scheduleEnabled" = true,
  "scheduleAnchor" = 'check_in',
  "scheduleOffsetDays" = -1,
  "scheduleHour" = 10,
  "scheduleMinute" = 0
WHERE "rowNo" = 111 AND "active" = true;

UPDATE "AgencyMessageTemplate" SET
  "scheduleTiming" = 'Çıkıştan 1 Gün Önce Saat: 15:00',
  "scheduleEnabled" = true,
  "scheduleAnchor" = 'check_out',
  "scheduleOffsetDays" = -1,
  "scheduleHour" = 15,
  "scheduleMinute" = 0
WHERE "rowNo" = 113 AND "active" = true;

UPDATE "AgencyMessageTemplate" SET
  "scheduleTiming" = 'Girişten 1 Gün Önce Saat: 10:00',
  "scheduleEnabled" = true,
  "scheduleAnchor" = 'check_in',
  "scheduleOffsetDays" = -1,
  "scheduleHour" = 10,
  "scheduleMinute" = 0
WHERE "rowNo" = 401 AND "active" = true;

UPDATE "AgencyMessageTemplate" SET
  "scheduleTiming" = 'Çıkıştan 1 Gün Önce Saat: 15:00',
  "scheduleEnabled" = true,
  "scheduleAnchor" = 'check_out',
  "scheduleOffsetDays" = -1,
  "scheduleHour" = 15,
  "scheduleMinute" = 0
WHERE "rowNo" = 403 AND "active" = true;
