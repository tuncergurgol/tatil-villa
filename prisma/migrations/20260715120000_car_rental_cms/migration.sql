-- CreateTable
CREATE TABLE "CarRentalPageSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "heroBadge" TEXT NOT NULL DEFAULT 'Türkiye''nin #1 Araç Kiralama Platformu',
    "heroTitle" TEXT NOT NULL DEFAULT 'Hayalinizdeki Araca Birkaç Tıkla Ulaşın',
    "heroSubtitle" TEXT NOT NULL DEFAULT '50+ lokasyon, 2000+ araç seçeneği ile Türkiye''nin her yerinde güvenilir ve uygun fiyatlı araç kiralama',
    "sameLocationDefault" BOOLEAN NOT NULL DEFAULT true,
    "showSameLocationToggle" BOOLEAN NOT NULL DEFAULT true,
    "sameLocationLabel" TEXT NOT NULL DEFAULT 'Aynı noktadan teslim',
    "pickupLabel" TEXT NOT NULL DEFAULT 'Alış Noktası',
    "returnLabel" TEXT NOT NULL DEFAULT 'Teslim Noktası',
    "pickupDateLabel" TEXT NOT NULL DEFAULT 'Alış Tarihi',
    "returnDateLabel" TEXT NOT NULL DEFAULT 'Teslim Tarihi',
    "driverAgeLabel" TEXT NOT NULL DEFAULT 'Sürücü Yaşı',
    "driverAgeOptionsJson" TEXT NOT NULL DEFAULT '["21-24 yaş","25-69 yaş","70+ yaş"]',
    "defaultDriverAge" TEXT NOT NULL DEFAULT '25-69 yaş',
    "ctaText" TEXT NOT NULL DEFAULT 'Araç Ara',
    "rentalDaysHint" TEXT NOT NULL DEFAULT '7 gün kiralama',
    "categoriesTitle" TEXT NOT NULL DEFAULT 'Araç Kategorileri',
    "categoriesSubtitle" TEXT NOT NULL DEFAULT 'İhtiyacınıza en uygun aracı seçin',
    "locationsTitle" TEXT NOT NULL DEFAULT 'Popüler Lokasyonlar',
    "locationsSubtitle" TEXT NOT NULL DEFAULT 'En çok tercih edilen araç kiralama noktaları',
    "criteriaTitle" TEXT NOT NULL DEFAULT 'Sürücü Kriterleri',
    "criteriaSubtitle" TEXT NOT NULL DEFAULT 'Kiralama için gereken temel şartlar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRentalPageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarRentalCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceFrom" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "image" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRentalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarRentalLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "iataCode" TEXT NOT NULL DEFAULT '',
    "vehicleCountHint" TEXT NOT NULL DEFAULT '',
    "isAirport" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRentalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarRentalDriverCriterion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRentalDriverCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarRentalCategory_slug_key" ON "CarRentalCategory"("slug");

-- CreateIndex
CREATE INDEX "CarRentalCategory_isActive_idx" ON "CarRentalCategory"("isActive");

-- CreateIndex
CREATE INDEX "CarRentalCategory_sortOrder_idx" ON "CarRentalCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "CarRentalLocation_isActive_idx" ON "CarRentalLocation"("isActive");

-- CreateIndex
CREATE INDEX "CarRentalLocation_isPopular_idx" ON "CarRentalLocation"("isPopular");

-- CreateIndex
CREATE INDEX "CarRentalLocation_sortOrder_idx" ON "CarRentalLocation"("sortOrder");

-- CreateIndex
CREATE INDEX "CarRentalLocation_city_idx" ON "CarRentalLocation"("city");

-- CreateIndex
CREATE INDEX "CarRentalLocation_iataCode_idx" ON "CarRentalLocation"("iataCode");

-- CreateIndex
CREATE INDEX "CarRentalDriverCriterion_isActive_idx" ON "CarRentalDriverCriterion"("isActive");

-- CreateIndex
CREATE INDEX "CarRentalDriverCriterion_sortOrder_idx" ON "CarRentalDriverCriterion"("sortOrder");
