-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "externalSyncUrl1" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncUrl2" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncUrl3" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncUrl4" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncLastSyncedAt1" TIMESTAMP(3),
ADD COLUMN "externalSyncLastSyncedAt2" TIMESTAMP(3),
ADD COLUMN "externalSyncLastSyncedAt3" TIMESTAMP(3),
ADD COLUMN "externalSyncLastSyncedAt4" TIMESTAMP(3),
ADD COLUMN "externalSyncLastMessage1" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncLastMessage2" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncLastMessage3" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalSyncLastMessage4" TEXT NOT NULL DEFAULT '';
