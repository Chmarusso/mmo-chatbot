import { PrismaClient, Prisma } from '@prisma/client';
import { generateBadgeQrSecret } from '@/lib/qr/badge';
import {
  seedPreferenceOptions,
  GAME_ENTRIES,
  TIME_SLOT_ENTRIES,
  LANGUAGE_ENTRIES,
  PLAYSTYLE_ENTRIES,
} from './seeds/preferenceOptions';

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Nova',
  'Astra',
  'Orion',
  'Lyra',
  'Kael',
  'Zara',
  'Riven',
  'Mira',
  'Sol',
  'Vega',
  'Talos',
  'Nyx',
  'Axiom',
  'Kira',
  'Darius',
  'Ember',
  'Lyn',
  'Kade',
  'Sora',
  'Finn',
];

const LAST_NAMES = [
  'Stormwind',
  'Nightbloom',
  'Ironvale',
  'Silverkeep',
  'Starborn',
  'Frostgarde',
  'Shadowspire',
  'Mooncrest',
  'Ashenfall',
  'Brightforge',
  'Windrunner',
  'Dawnbringer',
  'Cloudstride',
  'Sunlance',
  'Ironwood',
  'Voidwalker',
  'Swiftblade',
  'Stormrider',
  'Dragonsong',
  'Runeweaver',
];

const ROLE_TAGLINES = [
  'support main looking for coordinated runs',
  'tank specialist who loves aggressive pulls',
  'healer with a calm mindset and raid discipline',
  'DPS theorycrafter chasing top parses',
  'crafting guru sharing buffs and gear',
  'strategy caller focused on progression clears',
  'lore hunter who never skips cutscenes',
  'new content explorer mapping hidden achievements',
];

const AVATAR_STYLES = ['bottts', 'adventurer', 'pixel-art', 'identicon'] as const;

const randomItem = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const GAME_LABEL_MAP = new Map(GAME_ENTRIES.map(({ value, label }) => [value, label] as const));
const PLAYSTYLE_LABEL_MAP = new Map(PLAYSTYLE_ENTRIES.map(({ value, label }) => [value, label] as const));

async function seedRandomPlayers(count: number) {
  console.log(`\nCreating ${count} random pilot profiles...`);

  for (let index = 0; index < count; index += 1) {
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `player${String(index + 1).padStart(3, '0')}@seed.mmo`;
    const playstyleOption = randomItem(PLAYSTYLE_ENTRIES);
    const gameOption = randomItem(GAME_ENTRIES);
    const timeSlotOption = randomItem(TIME_SLOT_ENTRIES);
    const languageOption = randomItem(LANGUAGE_ENTRIES);
    const tagline = randomItem(ROLE_TAGLINES);
    const shouldIncludeBio = Math.random() > 0.15;
    const avatarStyle = randomItem(AVATAR_STYLES);
    const avatarSeed = slugify(`${name}-${index}`) || `pilot-${index}`;
    const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}&scale=110`;
    const gameLabel = GAME_LABEL_MAP.get(gameOption.value) ?? gameOption.value;
    const playstyleLabel = PLAYSTYLE_LABEL_MAP.get(playstyleOption.value) ?? playstyleOption.value;
    const bio = shouldIncludeBio
      ? `${name.split(' ')[0]} ${tagline}. Loves ${gameLabel} ${playstyleLabel.toLowerCase()} runs.`
      : null;

    await createUser(email, name, {
      bio,
      avatarUrl,
      gamePref: gameOption.value,
      timeSlot: timeSlotOption.value,
      language: languageOption.value,
      playstyle: playstyleOption.value,
      isVerified: Math.random() > 0.6,
      isChild: false,
      twitterLink: null,
      redditLink: null,
    });
  }
}

async function createUser(email: string, name: string, extra?: Partial<Parameters<typeof prisma.profile.create>[0]['data']>) {
  return prisma.user.upsert({
    where: { email },
    update: {
      profile: {
        update: {
          name,
          ...extra,
        },
      },
    },
    create: {
      email,
      profile: {
        create: {
          name,
          ...extra,
        },
      },
    },
    include: {
      profile: true,
    },
  });
}

async function main() {
  console.log('Seeding MMO Match sample data...');

  await seedPreferenceOptions(prisma);

  const guardian = await createUser('guardian@example.com', 'Guardian Nova', {
    isVerified: true,
    gamePref: GAME_ENTRIES[0]?.value,
    timeSlot: TIME_SLOT_ENTRIES[0]?.value,
    language: LANGUAGE_ENTRIES[0]?.value,
    playstyle: PLAYSTYLE_ENTRIES[0]?.value,
  });

  const kid = await createUser('kid@example.com', 'Kid Ranger', {
    isChild: true,
    gamePref: GAME_ENTRIES[1]?.value,
    timeSlot: TIME_SLOT_ENTRIES[1]?.value,
    language: LANGUAGE_ENTRIES[1]?.value,
    playstyle: PLAYSTYLE_ENTRIES[1]?.value,
  });

  if (!guardian.profile || !kid.profile) {
    throw new Error('Seed profiles failed to create');
  }

  const guardianProfile = guardian.profile;
  const kidProfile = kid.profile;

  await prisma.profile.update({
    where: { id: kidProfile.id },
    data: { guardianProfileId: guardianProfile.id },
  });

  let guild = await prisma.guild.findUnique({
    where: { inviteCode: 'GUARDIAN123' },
    include: {
      members: true,
    },
  });

  if (!guild) {
    const creationCode = await prisma.guildCreationCode.create({
      data: {
        code: 'SEEDCODE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        redeemedAt: new Date(),
        redeemedByProfileId: guardianProfile.id,
      },
    });

    guild = await prisma.guild.create({
      data: {
        name: 'Guardian Vanguard',
        description: 'Family-friendly guild focused on co-op adventures.',
        ownerId: guardianProfile.id,
        inviteCode: 'GUARDIAN123',
        creationCodeId: creationCode.id,
        members: {
          createMany: {
            data: [
              { profileId: guardianProfile.id, role: 'OWNER' },
              { profileId: kidProfile.id, role: 'MEMBER' },
            ],
          },
        },
      },
      include: {
        members: true,
      },
    });
  } else {
    await prisma.guildMembership.upsert({
      where: {
        guildId_profileId: {
          guildId: guild.id,
          profileId: guardianProfile.id,
        },
      },
      update: { role: 'OWNER' },
      create: {
        guildId: guild.id,
        profileId: guardianProfile.id,
        role: 'OWNER',
      },
    });

    await prisma.guildMembership.upsert({
      where: {
        guildId_profileId: {
          guildId: guild.id,
          profileId: kidProfile.id,
        },
      },
      update: { role: 'MEMBER' },
      create: {
        guildId: guild.id,
        profileId: kidProfile.id,
        role: 'MEMBER',
      },
    });
  }

  if (!guild) {
    throw new Error('Guild seeding failed');
  }

  await prisma.guildEvent.createMany({
    data: [
      {
        guildId: guild.id,
        title: 'Weekend Raid',
        description: 'Time to tackle the new dungeon together! All levels welcome.',
        locationType: 'ONLINE',
        locationDetail: 'Discord voice channel',
        startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdByProfileId: guardianProfile.id,
      },
      {
        guildId: guild.id,
        title: 'Community Meetup',
        description: 'In-person gathering at the local game lounge.',
        locationType: 'OFFLINE',
        locationDetail: 'Pixel Lounge, 123 Retro Rd',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByProfileId: guardianProfile.id,
      },
    ],
  });

  await prisma.badge.createMany({
    data: [
      {
        slug: 'founders-square',
        name: 'Founders Square',
        description: 'Visit the original meetup point.',
        latitude: new Prisma.Decimal('37.7749000'),
        longitude: new Prisma.Decimal('-122.4194000'),
        radiusMeters: 80,
        qrRequired: false,
      },
      {
        slug: 'elite-hall',
        name: 'Elite Hall',
        description: 'Flash your QR pass to enter the elite hall.',
        latitude: new Prisma.Decimal('34.0522000'),
        longitude: new Prisma.Decimal('-118.2437000'),
        radiusMeters: 30,
        qrRequired: true,
        qrSecret: generateBadgeQrSecret(),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.match.upsert({
    where: {
      user1Id_user2Id: {
        user1Id: guardianProfile.id,
        user2Id: kidProfile.id,
      },
    },
    update: {},
    create: {
      user1Id: guardianProfile.id,
      user2Id: kidProfile.id,
      status: 'ACTIVE',
    },
  });

  const RANDOM_PLAYER_COUNT = 100;
  await seedRandomPlayers(RANDOM_PLAYER_COUNT);

  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
