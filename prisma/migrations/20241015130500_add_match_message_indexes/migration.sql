CREATE INDEX "Match_createdAt_idx" ON "Match" ("createdAt");
CREATE INDEX "Message_matchId_createdAt_idx" ON "Message" ("matchId", "createdAt" DESC);
