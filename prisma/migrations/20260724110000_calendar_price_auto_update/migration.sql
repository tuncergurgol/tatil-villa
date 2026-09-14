ALTER TABLE "CompanySettings"
ADD COLUMN "calendarPriceAutoUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "calendarPriceAutoUpdatePeriod" TEXT NOT NULL DEFAULT 'hour',
ADD COLUMN "calendarPriceAutoUpdateInterval" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "calendarPriceAutoUpdateCriteriaJson" TEXT NOT NULL DEFAULT '["ical","link1","link2","link3"]',
ADD COLUMN "calendarPriceAutoUpdateLastRunAt" TIMESTAMP(3);
