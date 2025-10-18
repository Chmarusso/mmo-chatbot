-- Create table for game update suggestions
CREATE TABLE "GameUpdateSuggestion" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "gameValue" VARCHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "comment" VARCHAR(1000),
  "status" "GameSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes" VARCHAR(1000),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "handledAt" TIMESTAMP,
  "createdByProfileId" UUID NOT NULL,
  "handledByProfileId" UUID,
  CONSTRAINT "GameUpdateSuggestion_gameValue_fkey"
    FOREIGN KEY ("gameValue") REFERENCES "Game"("value") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GameUpdateSuggestion_createdByProfileId_fkey"
    FOREIGN KEY ("createdByProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GameUpdateSuggestion_handledByProfileId_fkey"
    FOREIGN KEY ("handledByProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "GameUpdateSuggestion_status_idx" ON "GameUpdateSuggestion"("status");
CREATE INDEX "GameUpdateSuggestion_createdAt_idx" ON "GameUpdateSuggestion"("createdAt");
CREATE INDEX "GameUpdateSuggestion_gameValue_idx" ON "GameUpdateSuggestion"("gameValue");

CREATE OR REPLACE FUNCTION set_game_update_suggestion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_update_suggestion_set_updated_at
BEFORE UPDATE ON "GameUpdateSuggestion"
FOR EACH ROW
EXECUTE FUNCTION set_game_update_suggestion_updated_at();
