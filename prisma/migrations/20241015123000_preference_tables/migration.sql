-- Create lookup tables for player preferences
CREATE TABLE "Game" (
  "value" VARCHAR(64) PRIMARY KEY,
  "label" VARCHAR(128) NOT NULL
);

CREATE TABLE "TimeSlotOption" (
  "value" VARCHAR(64) PRIMARY KEY,
  "label" VARCHAR(128) NOT NULL
);

CREATE TABLE "LanguageOption" (
  "value" VARCHAR(64) PRIMARY KEY,
  "label" VARCHAR(128) NOT NULL,
  "icon" VARCHAR(16)
);

CREATE TABLE "PlaystyleOption" (
  "value" VARCHAR(64) PRIMARY KEY,
  "label" VARCHAR(128) NOT NULL
);

INSERT INTO "Game" ("value", "label") VALUES
  ('world_of_warcraft', 'World of Warcraft'),
  ('final_fantasy_xiv', 'Final Fantasy XIV'),
  ('lost_ark', 'Lost Ark'),
  ('elder_scrolls_online', 'Elder Scrolls Online'),
  ('new_world', 'New World'),
  ('guild_wars_2', 'Guild Wars 2'),
  ('black_desert_online', 'Black Desert Online')
ON CONFLICT ("value") DO NOTHING;

INSERT INTO "TimeSlotOption" ("value", "label") VALUES
  ('weekdays_mornings', 'Weekday mornings (06:00-10:00)'),
  ('weekdays_afternoons', 'Weekday afternoons (12:00-16:00)'),
  ('weekdays_evenings', 'Weekday evenings (17:00-21:00)'),
  ('weekends_mornings', 'Weekend mornings (08:00-12:00)'),
  ('weekends_afternoons', 'Weekend afternoons (12:00-16:00)'),
  ('weekends_evenings', 'Weekend evenings (16:00-20:00)'),
  ('weekends_late', 'Weekend late nights (20:00-24:00)')
ON CONFLICT ("value") DO NOTHING;

INSERT INTO "LanguageOption" ("value", "label", "icon") VALUES
  ('english', 'English', '🇬🇧'),
  ('spanish', 'Spanish', '🇪🇸'),
  ('french', 'French', '🇫🇷'),
  ('german', 'German', '🇩🇪'),
  ('portuguese', 'Portuguese', '🇵🇹'),
  ('russian', 'Russian', '🇷🇺'),
  ('chinese', 'Chinese', '🇨🇳'),
  ('polish', 'Polish', '🇵🇱')
ON CONFLICT ("value") DO NOTHING;

INSERT INTO "PlaystyleOption" ("value", "label") VALUES
  ('casual', 'Casual'),
  ('competitive', 'Competitive'),
  ('role_playing', 'Role-Playing'),
  ('pve_focused', 'PvE-Focused'),
  ('pvp_focused', 'PvP-Focused'),
  ('explorer', 'Explorer')
ON CONFLICT ("value") DO NOTHING;

ALTER TABLE "Profile" ALTER COLUMN "gamePref" TYPE VARCHAR(64) USING "gamePref"::text;
ALTER TABLE "Profile" ALTER COLUMN "timeSlot" TYPE VARCHAR(64) USING "timeSlot"::text;
ALTER TABLE "Profile" ALTER COLUMN "language" TYPE VARCHAR(64) USING "language"::text;
ALTER TABLE "Profile" ALTER COLUMN "playstyle" TYPE VARCHAR(64) USING "playstyle"::text;

UPDATE "Profile" SET "timeSlot" = 'weekdays_afternoons' WHERE "timeSlot" = 'weekdays_evenings';
UPDATE "Profile" SET "timeSlot" = 'weekdays_evenings' WHERE "timeSlot" = 'weekdays_nights';
UPDATE "Profile" SET "timeSlot" = 'weekends_late' WHERE "timeSlot" = 'weekends_all_day';

ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_gamePref_fkey" FOREIGN KEY ("gamePref") REFERENCES "Game"("value") ON DELETE SET NULL;
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_timeSlot_fkey" FOREIGN KEY ("timeSlot") REFERENCES "TimeSlotOption"("value") ON DELETE SET NULL;
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_language_fkey" FOREIGN KEY ("language") REFERENCES "LanguageOption"("value") ON DELETE SET NULL;
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_playstyle_fkey" FOREIGN KEY ("playstyle") REFERENCES "PlaystyleOption"("value") ON DELETE SET NULL;

DROP TYPE IF EXISTS "GamePref";
DROP TYPE IF EXISTS "TimeSlot";
DROP TYPE IF EXISTS "Language";
DROP TYPE IF EXISTS "Playstyle";
