-- Müşteri kayıtları

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "contactChannelId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_active_idx" ON "Customer"("active");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_fullName_idx" ON "Customer"("fullName");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_contactChannelId_fkey" FOREIGN KEY ("contactChannelId") REFERENCES "CustomerContactChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rezervasyonlardan benzersiz telefon numaralarına göre müşteri aktarımı
WITH booking_phones AS (
    SELECT
        b."guestName",
        b."guestEmail",
        b."updatedAt",
        RIGHT(
            CASE
                WHEN LENGTH(d) >= 12 AND d LIKE '90%' THEN SUBSTRING(d FROM 3)
                WHEN LENGTH(d) = 11 AND d LIKE '0%' THEN SUBSTRING(d FROM 2)
                ELSE d
            END,
            10
        ) AS normalized_phone
    FROM "Booking" b
    CROSS JOIN LATERAL (
        SELECT regexp_replace(b."guestPhone", '[^0-9]', '', 'g') AS d
    ) AS digits
),
latest AS (
    SELECT DISTINCT ON (normalized_phone)
        normalized_phone,
        "guestName",
        "guestEmail",
        "updatedAt"
    FROM booking_phones
    WHERE normalized_phone <> '' AND LENGTH(normalized_phone) = 10
    ORDER BY normalized_phone, "updatedAt" DESC
)
INSERT INTO "Customer" ("id", "fullName", "phone", "email", "contactChannelId", "active", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "guestName",
    '+90' || normalized_phone,
    COALESCE("guestEmail", ''),
    NULL,
    true,
    "updatedAt",
    CURRENT_TIMESTAMP
FROM latest;
