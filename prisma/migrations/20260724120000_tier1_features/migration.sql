-- Tier 1 features: timezones, recurring events, calendar feeds, availability,
-- push notifications, direct/group messaging, and media sharing.
--
-- Written to be idempotent. The schema had drifted ahead of the migration history
-- (earlier changes were applied with `prisma db push`), so every ADD COLUMN and
-- CREATE is guarded and this migration is safe to run against a database that
-- already has some of these objects.

-- ============================================
-- Column additions
-- ============================================

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "opponentName" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "homeScore" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "awayScore" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "timezone" TEXT;

ALTER TABLE "RSVP" ADD COLUMN IF NOT EXISTS "autoFilled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorRecoveryCodes" TEXT;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachments" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ============================================
-- New tables
-- ============================================

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEAM',
    "name" TEXT,
    "createdById" TEXT,
    "lookupKey" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "deviceName" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MediaAlbum" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "eventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAlbum_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MediaItem" (
    "id" TEXT NOT NULL,
    "albumId" TEXT,
    "teamId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Message -> Conversation backfill
--
-- Messages were previously addressed by teamId alone. Every existing message has to
-- land in its team's broadcast conversation before conversationId can be made NOT
-- NULL, so this runs in three phases: add the column nullable, backfill, then
-- tighten the constraint.
-- ============================================

-- Phase 1: nullable so the ALTER succeeds against existing rows.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;

-- Phase 2a: one TEAM conversation per team that has messages or members.
INSERT INTO "Conversation" ("id", "teamId", "type", "lookupKey", "lastMessageAt", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    t."id",
    'TEAM',
    'team:' || t."id",
    (SELECT MAX(m."createdAt") FROM "Message" m WHERE m."teamId" = t."id"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Team" t
WHERE NOT EXISTS (
    SELECT 1 FROM "Conversation" c WHERE c."lookupKey" = 'team:' || t."id"
);

-- Phase 2b: point every existing message at its team's conversation.
UPDATE "Message" m
SET "conversationId" = c."id"
FROM "Conversation" c
WHERE c."lookupKey" = 'team:' || m."teamId"
  AND m."conversationId" IS NULL;

-- Phase 2c: enrol current team members so unread counts work from day one.
INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt")
SELECT gen_random_uuid()::text, c."id", tm."userId", CURRENT_TIMESTAMP
FROM "Conversation" c
JOIN "TeamMember" tm ON tm."teamId" = c."teamId"
WHERE c."type" = 'TEAM'
  AND NOT EXISTS (
    SELECT 1 FROM "ConversationParticipant" p
    WHERE p."conversationId" = c."id" AND p."userId" = tm."userId"
);

-- Any message whose team was deleted has nothing to attach to; drop the orphans
-- rather than block the migration.
DELETE FROM "Message" WHERE "conversationId" IS NULL;

-- Phase 3: enforce the constraint now that every row is populated.
ALTER TABLE "Message" ALTER COLUMN "conversationId" SET NOT NULL;

-- teamId becomes optional: direct messages between users on different teams have no
-- single owning team.
ALTER TABLE "Message" ALTER COLUMN "teamId" DROP NOT NULL;

-- ============================================
-- Indexes
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_lookupKey_key" ON "Conversation"("lookupKey");
CREATE INDEX IF NOT EXISTS "Conversation_teamId_idx" ON "Conversation"("teamId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

CREATE UNIQUE INDEX IF NOT EXISTS "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

CREATE INDEX IF NOT EXISTS "AvailabilityBlock_userId_startDate_endDate_idx" ON "AvailabilityBlock"("userId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "AvailabilityBlock_teamId_idx" ON "AvailabilityBlock"("teamId");

CREATE INDEX IF NOT EXISTS "MediaAlbum_teamId_createdAt_idx" ON "MediaAlbum"("teamId", "createdAt");
CREATE INDEX IF NOT EXISTS "MediaItem_teamId_createdAt_idx" ON "MediaItem"("teamId", "createdAt");
CREATE INDEX IF NOT EXISTS "MediaItem_albumId_idx" ON "MediaItem"("albumId");

CREATE INDEX IF NOT EXISTS "Event_seriesId_idx" ON "Event"("seriesId");
CREATE INDEX IF NOT EXISTS "Event_teamId_startTime_idx" ON "Event"("teamId", "startTime");

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_threadId_idx" ON "Message"("threadId");

CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarToken_key" ON "User"("calendarToken");

-- ============================================
-- Foreign keys
--
-- ADD CONSTRAINT has no IF NOT EXISTS in Postgres, so each is guarded by a catalog
-- check to keep the migration re-runnable.
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_teamId_fkey') THEN
        ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationParticipant_conversationId_fkey') THEN
        ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
            FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationParticipant_userId_fkey') THEN
        ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_conversationId_fkey') THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
            FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageReaction_messageId_fkey') THEN
        ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
            FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageReaction_userId_fkey') THEN
        ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushToken_userId_fkey') THEN
        ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityBlock_userId_fkey') THEN
        ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityBlock_teamId_fkey') THEN
        ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAlbum_teamId_fkey') THEN
        ALTER TABLE "MediaAlbum" ADD CONSTRAINT "MediaAlbum_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAlbum_createdById_fkey') THEN
        ALTER TABLE "MediaAlbum" ADD CONSTRAINT "MediaAlbum_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaItem_albumId_fkey') THEN
        ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_albumId_fkey"
            FOREIGN KEY ("albumId") REFERENCES "MediaAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaItem_teamId_fkey') THEN
        ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaItem_uploaderId_fkey') THEN
        ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_uploaderId_fkey"
            FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
