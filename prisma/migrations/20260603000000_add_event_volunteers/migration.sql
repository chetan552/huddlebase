-- CreateTable
CREATE TABLE "EventVolunteerNeed" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SNACKS',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slotsNeeded" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventVolunteerNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventVolunteerSignup" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventVolunteerSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventVolunteerSignup_needId_userId_key" ON "EventVolunteerSignup"("needId", "userId");

-- AddForeignKey
ALTER TABLE "EventVolunteerNeed" ADD CONSTRAINT "EventVolunteerNeed_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVolunteerSignup" ADD CONSTRAINT "EventVolunteerSignup_needId_fkey" FOREIGN KEY ("needId") REFERENCES "EventVolunteerNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVolunteerSignup" ADD CONSTRAINT "EventVolunteerSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
