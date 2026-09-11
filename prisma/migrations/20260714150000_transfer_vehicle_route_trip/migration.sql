-- CreateEnum
CREATE TYPE "TransferTripDirection" AS ENUM ('ONE_WAY', 'ROUND_TRIP');

-- CreateEnum
CREATE TYPE "TransferTripStatus" AS ENUM ('NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TransferVehicleType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "passengerCapacity" INTEGER NOT NULL DEFAULT 4,
    "luggageCapacity" INTEGER NOT NULL DEFAULT 2,
    "basePricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minimumFare" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "includedKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'EUR',
    "image" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferVehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRoute" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startPoint" TEXT NOT NULL,
    "endPoint" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tag" TEXT NOT NULL DEFAULT '',
    "sefUrl" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDesc" TEXT NOT NULL DEFAULT '',
    "seoKeywords" TEXT NOT NULL DEFAULT '',
    "creditCardPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankTransferDiscountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditCardDiscountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onList" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRouteVehiclePrice" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRouteVehiclePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferTrip" (
    "id" TEXT NOT NULL,
    "routeId" TEXT,
    "vehicleTypeId" TEXT NOT NULL,
    "startPoint" TEXT NOT NULL,
    "endPoint" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "direction" "TransferTripDirection" NOT NULL DEFAULT 'ONE_WAY',
    "serviceType" TEXT NOT NULL DEFAULT '',
    "tripDate" DATE NOT NULL,
    "tripTime" TEXT NOT NULL DEFAULT '',
    "returnDate" DATE,
    "returnTime" TEXT NOT NULL DEFAULT '',
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "babies" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactSurname" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactIdNumber" TEXT NOT NULL DEFAULT '',
    "flightNumber" TEXT NOT NULL DEFAULT '',
    "driverSign" TEXT NOT NULL DEFAULT '',
    "totalPrice" DOUBLE PRECISION,
    "currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'EUR',
    "status" "TransferTripStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "specialRequests" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferVehicleType_code_key" ON "TransferVehicleType"("code");

-- CreateIndex
CREATE INDEX "TransferVehicleType_isActive_idx" ON "TransferVehicleType"("isActive");

-- CreateIndex
CREATE INDEX "TransferVehicleType_sortOrder_idx" ON "TransferVehicleType"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRoute_slug_key" ON "TransferRoute"("slug");

-- CreateIndex
CREATE INDEX "TransferRoute_isActive_idx" ON "TransferRoute"("isActive");

-- CreateIndex
CREATE INDEX "TransferRoute_onList_idx" ON "TransferRoute"("onList");

-- CreateIndex
CREATE INDEX "TransferRoute_priority_idx" ON "TransferRoute"("priority");

-- CreateIndex
CREATE INDEX "TransferRoute_startPoint_idx" ON "TransferRoute"("startPoint");

-- CreateIndex
CREATE INDEX "TransferRoute_endPoint_idx" ON "TransferRoute"("endPoint");

-- CreateIndex
CREATE INDEX "TransferRouteVehiclePrice_routeId_idx" ON "TransferRouteVehiclePrice"("routeId");

-- CreateIndex
CREATE INDEX "TransferRouteVehiclePrice_vehicleTypeId_idx" ON "TransferRouteVehiclePrice"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "TransferRouteVehiclePrice_isActive_idx" ON "TransferRouteVehiclePrice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRouteVehiclePrice_routeId_vehicleTypeId_key" ON "TransferRouteVehiclePrice"("routeId", "vehicleTypeId");

-- CreateIndex
CREATE INDEX "TransferTrip_routeId_idx" ON "TransferTrip"("routeId");

-- CreateIndex
CREATE INDEX "TransferTrip_vehicleTypeId_idx" ON "TransferTrip"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "TransferTrip_tripDate_idx" ON "TransferTrip"("tripDate");

-- CreateIndex
CREATE INDEX "TransferTrip_status_idx" ON "TransferTrip"("status");

-- CreateIndex
CREATE INDEX "TransferTrip_direction_idx" ON "TransferTrip"("direction");

-- AddForeignKey
ALTER TABLE "TransferRouteVehiclePrice" ADD CONSTRAINT "TransferRouteVehiclePrice_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransferRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRouteVehiclePrice" ADD CONSTRAINT "TransferRouteVehiclePrice_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "TransferVehicleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferTrip" ADD CONSTRAINT "TransferTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransferRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferTrip" ADD CONSTRAINT "TransferTrip_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "TransferVehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
