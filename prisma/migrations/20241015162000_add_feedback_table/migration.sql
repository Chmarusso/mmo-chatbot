CREATE TABLE "Feedback" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "profileId" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Feedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE
);

CREATE INDEX "Feedback_profileId_idx" ON "Feedback" ("profileId");
