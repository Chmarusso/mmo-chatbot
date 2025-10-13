import { PrismaClient } from '@prisma/client';
import { GAME_OPTIONS, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from '../../types/profile';

const GAME_CATEGORIES = [
  {
    value: 'mmorpg',
    label: 'MMORPG',
    description: 'Massively Multiplayer Online Role-Playing Games with persistent worlds',
  },
  {
    value: 'action_rpg',
    label: 'Action RPG',
    description: 'Fast-paced combat with RPG elements and real-time action',
  },
  {
    value: 'survival',
    label: 'Survival',
    description: 'Resource gathering, crafting, and survival in challenging environments',
  },
  {
    value: 'sandbox',
    label: 'Sandbox',
    description: 'Open-world games with player-driven content and creative freedom',
  },
  {
    value: 'pvp_focused',
    label: 'PvP Focused',
    description: 'Player versus player combat is the primary focus',
  },
  {
    value: 'story_driven',
    label: 'Story-Driven',
    description: 'Rich narrative and character development with engaging storylines',
  },
];

const GAME_DETAILS = {
  world_of_warcraft: {
    description: 'Epic fantasy MMORPG with raids, dungeons, and endless adventure across Azeroth.',
    screenshot: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg',
    website: 'https://worldofwarcraft.com',
    categoryValue: 'mmorpg',
  },
  final_fantasy_xiv: {
    description: 'Story-rich MMORPG with engaging combat, crafting, and a vibrant community.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/39210/header.jpg',
    website: 'https://www.finalfantasyxiv.com',
    categoryValue: 'story_driven',
  },
  lost_ark: {
    description: 'Action-packed MMORPG with stunning visuals and dynamic combat mechanics.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1599340/header.jpg',
    website: 'https://www.playlostark.com',
    categoryValue: 'action_rpg',
  },
  elder_scrolls_online: {
    description: 'Explore Tamriel with friends in this expansive Elder Scrolls MMO adventure.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/306130/header.jpg',
    website: 'https://www.elderscrollsonline.com',
    categoryValue: 'mmorpg',
  },
  new_world: {
    description: 'Survive and thrive in a supernatural island filled with danger and mystery.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1063730/header.jpg',
    website: 'https://www.newworld.com',
    categoryValue: 'survival',
  },
  guild_wars_2: {
    description: 'Dynamic events and player-driven story in this beloved free-to-play MMO.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1284210/header.jpg',
    website: 'https://www.guildwars2.com',
    categoryValue: 'mmorpg',
  },
  black_desert_online: {
    description: 'Action combat MMO with stunning graphics and deep life skill systems.',
    screenshot: 'https://cdn.cloudflare.steamstatic.com/steam/apps/582660/header.jpg',
    website: 'https://www.naeu.playblackdesert.com',
    categoryValue: 'sandbox',
  },
};

export const GAME_ENTRIES = GAME_OPTIONS.map(({ value, label }) => ({
  value,
  label,
  description: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.description || null,
  screenshot: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.screenshot || null,
  website: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.website || null,
  categoryValue: GAME_DETAILS[value as keyof typeof GAME_DETAILS]?.categoryValue || null,
}));

export const TIME_SLOT_ENTRIES = TIME_SLOTS.map(({ value, label }) => ({ value, label }));
export const LANGUAGE_ENTRIES = LANGUAGES.map(({ value, label, icon }) => ({ value, label, icon: icon ?? null }));
export const PLAYSTYLE_ENTRIES = PLAYSTYLES.map(({ value, label }) => ({ value, label }));

export async function seedPreferenceOptions(prisma: PrismaClient) {
  // First, seed game categories
  for (const category of GAME_CATEGORIES) {
    await prisma.gameCategory.upsert({
      where: { value: category.value },
      update: {
        label: category.label,
        description: category.description,
      },
      create: category,
    });
  }

  // Get all categories to map them by value
  const categories = await prisma.gameCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.value, c.id]));

  // Upsert games with category relations
  for (const game of GAME_ENTRIES) {
    const categoryId = game.categoryValue ? categoryMap.get(game.categoryValue) : null;

    await prisma.game.upsert({
      where: { value: game.value },
      update: {
        label: game.label,
        description: game.description,
        screenshot: game.screenshot,
        website: game.website,
        categoryId: categoryId || null,
      },
      create: {
        value: game.value,
        label: game.label,
        description: game.description,
        screenshot: game.screenshot,
        website: game.website,
        categoryId: categoryId || null,
      },
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
