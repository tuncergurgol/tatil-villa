-- Messenger ve Facebook yorumları gelen kutusu

CREATE TABLE "MetaInboxThread" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "preview" TEXT NOT NULL DEFAULT '',
    "participantId" TEXT NOT NULL DEFAULT '',
    "replyExternalId" TEXT NOT NULL DEFAULT '',
    "phoneDigits" TEXT NOT NULL DEFAULT '',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "fromPage" BOOLEAN NOT NULL DEFAULT false,
    "permalink" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaInboxThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaInboxMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fromPage" BOOLEAN NOT NULL DEFAULT false,
    "senderName" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaInboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaInboxThread_externalId_key" ON "MetaInboxThread"("externalId");
CREATE INDEX "MetaInboxThread_channel_lastMessageAt_idx" ON "MetaInboxThread"("channel", "lastMessageAt");
CREATE UNIQUE INDEX "MetaInboxMessage_externalId_key" ON "MetaInboxMessage"("externalId");
CREATE INDEX "MetaInboxMessage_threadId_sentAt_idx" ON "MetaInboxMessage"("threadId", "sentAt");

ALTER TABLE "MetaInboxMessage" ADD CONSTRAINT "MetaInboxMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MetaInboxThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
