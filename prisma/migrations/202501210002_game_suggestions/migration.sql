-- Create enum for suggestion status
CREATE TYPE "GameSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Add admin flag to profiles
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Create suggestions table
CREATE TABLE "GameSuggestion" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" VARCHAR(150) NOT NULL,
  "description" VARCHAR(2000),
  "referenceUrl" VARCHAR(500),
  "status" "GameSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes" VARCHAR(1000),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "handledAt" TIMESTAMP,
  "createdByProfileId" UUID NOT NULL,
  "handledByProfileId" UUID,
  CONSTRAINT "GameSuggestion_createdByProfileId_fkey"
    FOREIGN KEY ("createdByProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GameSuggestion_handledByProfileId_fkey"
    FOREIGN KEY ("handledByProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "GameSuggestion_status_idx" ON "GameSuggestion" ("status");
CREATE INDEX "GameSuggestion_createdAt_idx" ON "GameSuggestion" ("createdAt");

-- Trigger to update updatedAt on change
CREATE OR REPLACE FUNCTION set_gamesuggestion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_suggestion_set_updated_at
BEFORE UPDATE ON "GameSuggestion"
FOR EACH ROW
EXECUTE FUNCTION set_gamesuggestion_updated_at();
