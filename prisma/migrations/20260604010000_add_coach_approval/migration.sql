ALTER TABLE "User" ADD COLUMN "coachApproved" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "coachApproved" = true
WHERE "role" IN ('ADMIN', 'COACH');
