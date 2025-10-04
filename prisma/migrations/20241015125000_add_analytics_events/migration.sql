CREATE TABLE "AnalyticsEvent" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "eventType" VARCHAR(64) NOT NULL,
  "profileId" UUID,
  "userId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE INDEX "AnalyticsEvent_profileId_idx" ON "AnalyticsEvent" ("profileId");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent" ("userId");
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent" ("eventType");
