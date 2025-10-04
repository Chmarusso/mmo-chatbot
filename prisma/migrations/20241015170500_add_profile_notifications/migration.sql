ALTER TABLE "Profile"
  ADD COLUMN "notifyOnNewMatch" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyOnNewMessage" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyOnAnnouncements" BOOLEAN NOT NULL DEFAULT true;
