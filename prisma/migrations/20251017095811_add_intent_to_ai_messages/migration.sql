-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN "intent" VARCHAR(64),
ADD COLUMN "intentConfidence" DOUBLE PRECISION,
ADD COLUMN "intentEntities" JSONB;

-- CreateIndex
CREATE INDEX "AiMessage_intent_idx" ON "AiMessage"("intent");
