-- CreateTable
CREATE TABLE "GameWebsiteClick" (
    "id" TEXT NOT NULL,
    "gameValue" VARCHAR(64) NOT NULL,
    "profileId" TEXT,
    "userId" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameWebsiteClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameWebsiteClick_gameValue_idx" ON "GameWebsiteClick"("gameValue");

-- CreateIndex
CREATE INDEX "GameWebsiteClick_profileId_idx" ON "GameWebsiteClick"("profileId");

-- CreateIndex
CREATE INDEX "GameWebsiteClick_createdAt_idx" ON "GameWebsiteClick"("createdAt");

-- AddForeignKey
ALTER TABLE "GameWebsiteClick" ADD CONSTRAINT "GameWebsiteClick_gameValue_fkey" FOREIGN KEY ("gameValue") REFERENCES "Game"("value") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameWebsiteClick" ADD CONSTRAINT "GameWebsiteClick_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameWebsiteClick" ADD CONSTRAINT "GameWebsiteClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
