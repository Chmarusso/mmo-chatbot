-- Create table for player invite codes
CREATE TABLE "InviteCode" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "code" VARCHAR(32) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "claimedAt" TIMESTAMPTZ,
  "claimedByProfileId" UUID,
  CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InviteCode_code_key" UNIQUE ("code"),
  CONSTRAINT "InviteCode_claimedByProfileId_key" UNIQUE ("claimedByProfileId"),
  CONSTRAINT "InviteCode_claimedByProfileId_fkey" FOREIGN KEY ("claimedByProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL
);

CREATE INDEX "InviteCode_claimedByProfileId_idx" ON "InviteCode" ("claimedByProfileId");

-- Normalize existing profile invite codes to uppercase
UPDATE "Profile"
SET "inviteCode" = UPPER("inviteCode")
WHERE "inviteCode" IS NOT NULL
  AND "inviteCode" <> '';

-- Backfill claimed invite codes for existing profiles
INSERT INTO "InviteCode" ("code", "claimedByProfileId", "claimedAt")
SELECT DISTINCT ON (UPPER("inviteCode"))
  UPPER("inviteCode") AS "code",
  "id" AS "claimedByProfileId",
  NOW() AS "claimedAt"
FROM "Profile"
WHERE "inviteCode" IS NOT NULL
  AND "inviteCode" <> ''
ORDER BY UPPER("inviteCode"), "createdAt"
ON CONFLICT ("code") DO UPDATE
SET "claimedByProfileId" = EXCLUDED."claimedByProfileId",
    "claimedAt" = EXCLUDED."claimedAt";
