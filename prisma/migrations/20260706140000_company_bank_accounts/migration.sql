-- CreateTable
CREATE TABLE "CompanyBankAccount" (
    "id" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountHolder" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyBankAccount_active_idx" ON "CompanyBankAccount"("active");

-- CreateIndex
CREATE INDEX "CompanyBankAccount_sortOrder_idx" ON "CompanyBankAccount"("sortOrder");

-- Migrate existing single bank record from CompanySettings
INSERT INTO "CompanyBankAccount" (
    "id",
    "paymentType",
    "bankName",
    "accountHolder",
    "iban",
    "sortOrder",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    'migrated_default',
    "paymentType",
    "bankName",
    "accountHolder",
    "iban",
    0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CompanySettings"
WHERE "id" = 'default'
  AND (
    "bankName" <> ''
    OR "iban" <> ''
    OR "accountHolder" <> ''
    OR "paymentType" <> ''
  );
