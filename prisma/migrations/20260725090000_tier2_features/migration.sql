-- Tier 2 features: venues, event assignments, team files, registration forms
-- with e-signed waivers, and payment plans with refunds.
--
-- Purely additive: new tables plus nullable columns on Event, Invoice and Payment.
-- No backfill is required. Guarded throughout so it is safe to re-run.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "venueId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "planId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Venue" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "mapUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EventAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "autoAssigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamFileFolder" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFileFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamFile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "folderId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "staffOnly" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RegistrationForm" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "season" TEXT,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "feeAmount" DOUBLE PRECISION,
    "feeTitle" TEXT,
    "waiverText" TEXT,
    "waiverTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "maxSubmissions" INTEGER,
    "publicToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RegistrationSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT,
    "playerName" TEXT NOT NULL,
    "playerEmail" TEXT,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "invoiceId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WaiverSignature" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT,
    "signedName" TEXT NOT NULL,
    "waiverText" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaiverSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentPlan" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "installments" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Venue_teamId_name_idx" ON "Venue"("teamId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventAssignment_eventId_idx" ON "EventAssignment"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventAssignment_userId_status_idx" ON "EventAssignment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamFileFolder_teamId_name_key" ON "TeamFileFolder"("teamId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamFile_teamId_createdAt_idx" ON "TeamFile"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamFile_folderId_idx" ON "TeamFile"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationForm_publicToken_key" ON "RegistrationForm"("publicToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RegistrationForm_teamId_status_idx" ON "RegistrationForm"("teamId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RegistrationSubmission_formId_status_idx" ON "RegistrationSubmission"("formId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RegistrationSubmission_userId_idx" ON "RegistrationSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WaiverSignature_submissionId_key" ON "WaiverSignature"("submissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentPlan_teamId_idx" ON "PaymentPlan"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Refund_invoiceId_idx" ON "Refund"("invoiceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_teamId_status_idx" ON "Invoice"("teamId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_planId_idx" ON "Invoice"("planId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_playerId_idx" ON "Invoice"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- Foreign keys (guarded: ADD CONSTRAINT has no IF NOT EXISTS in Postgres)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_venueId_fkey') THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Venue_teamId_fkey') THEN
        ALTER TABLE "Venue" ADD CONSTRAINT "Venue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventAssignment_eventId_fkey') THEN
        ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventAssignment_userId_fkey') THEN
        ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamFileFolder_teamId_fkey') THEN
        ALTER TABLE "TeamFileFolder" ADD CONSTRAINT "TeamFileFolder_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamFile_teamId_fkey') THEN
        ALTER TABLE "TeamFile" ADD CONSTRAINT "TeamFile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamFile_folderId_fkey') THEN
        ALTER TABLE "TeamFile" ADD CONSTRAINT "TeamFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "TeamFileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamFile_uploaderId_fkey') THEN
        ALTER TABLE "TeamFile" ADD CONSTRAINT "TeamFile_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationForm_teamId_fkey') THEN
        ALTER TABLE "RegistrationForm" ADD CONSTRAINT "RegistrationForm_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationSubmission_formId_fkey') THEN
        ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RegistrationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationSubmission_userId_fkey') THEN
        ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WaiverSignature_submissionId_fkey') THEN
        ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WaiverSignature_userId_fkey') THEN
        ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentPlan_teamId_fkey') THEN
        ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_planId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Refund_invoiceId_fkey') THEN
        ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Refund_paymentId_fkey') THEN
        ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

END $$;
