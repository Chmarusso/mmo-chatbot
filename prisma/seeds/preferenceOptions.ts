import { PrismaClient } from '@prisma/client';
import { GAME_OPTIONS, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from '../../types/profile';

const GAME_DETAILS = {
  world_of_warcraft: {
    description: 'Epic fantasy MMORPG with raids, dungeons, and endless adventure across Azeroth.',
    screenshot: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg',
    website: 'https://worldofwarcraft.com',
  },
  final_fantasy_xiv: {
    description: 'Story-rich MMORPG with engaging combat, crafting, and a vibrant community.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/39210/header.jpg',
    website: 'https://www.finalfantasyxiv.com',
  },
  lost_ark: {
    description: 'Action-packed MMORPG with stunning visuals and dynamic combat mechanics.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1599340/header.jpg',
    website: 'https://www.playlostark.com',
  },
  elder_scrolls_online: {
    description: 'Explore Tamriel with friends in this expansive Elder Scrolls MMO adventure.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/306130/header.jpg',
    website: 'https://www.elderscrollsonline.com',
  },
  new_world: {
    description: 'Survive and thrive in a supernatural island filled with danger and mystery.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1063730/header.jpg',
    website: 'https://www.newworld.com',
  },
  guild_wars_2: {
    description: 'Dynamic events and player-driven story in this beloved free-to-play MMO.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1284210/header.jpg',
    website: 'https://www.guildwars2.com',
  },
  black_desert_online: {
    description: 'Action combat MMO with stunning graphics and deep life skill systems.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/582660/header.jpg',
    website: 'https://www.naeu.playblackdesert.com',
  },
};

export const GAME_ENTRIES = GAME_OPTIONS.map(({ value, label }) => ({
  value,
  label,
  description: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.description || null,
  screenshot: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.screenshot || null,
  website: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.website || null,
}));

export const TIME_SLOT_ENTRIES = TIME_SLOTS.map(({ value, label }) => ({ value, label }));
export const LANGUAGE_ENTRIES = LANGUAGES.map(({ value, label, icon }) => ({ value, label, icon: icon ?? null }));
export const PLAYSTYLE_ENTRIES = PLAYSTYLES.map(({ value, label }) => ({ value, label }));

export async function seedPreferenceOptions(prisma: PrismaClient) {
  // Upsert games to ensure new fields are updated
  for (const game of GAME_ENTRIES) {
    await prisma.game.upsert({
      where: { value: game.value },
      update: {
        label: game.label,
        description: game.description,
        screenshot: game.screenshot,
        website: game.website,
      },
      create: game,
    });
  }

  await prisma.$transaction([
    prisma.timeSlotOption.createMany({ data: TIME_SLOT_ENTRIES, skipDuplicates: true }),
    prisma.languageOption.createMany({ data: LANGUAGE_ENTRIES, skipDuplicates: true }),
    prisma.playstyleOption.createMany({ data: PLAYSTYLE_ENTRIES, skipDuplicates: true }),
  ]);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedPreferenceOptions(prisma)
    .then(() => {
      console.log('Preference tables seeded.');
    })
    .catch((error) => {
      console.error('Failed to seed preference tables', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
