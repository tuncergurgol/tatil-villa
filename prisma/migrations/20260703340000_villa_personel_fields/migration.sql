-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "greeterName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "greeterPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calendarManagerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "calendarManagerPhone" TEXT NOT NULL DEFAULT '';
