-- WhatsApp doğrulama kodu (OTP) admin panelinden açılıp kapatılır.
-- Varsayılan kapalı: mevcut gönderimler durur; formlar kod beklemez.
ALTER TABLE "CompanySettings" ADD COLUMN "whatsappOtpEnabled" BOOLEAN NOT NULL DEFAULT false;
