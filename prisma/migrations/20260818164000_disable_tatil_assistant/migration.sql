-- YumYum Tatil Asistanı şimdilik pasif; daha sonra geliştirilecek.
ALTER TABLE "CompanySettings" ALTER COLUMN "tatilAssistantEnabled" SET DEFAULT false;
UPDATE "CompanySettings" SET "tatilAssistantEnabled" = false;
