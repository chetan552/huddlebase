ALTER TABLE "User" ADD COLUMN "aiPracticePlanEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "aiPracticePlanEnabled" = true
WHERE "role" = 'ADMIN';
