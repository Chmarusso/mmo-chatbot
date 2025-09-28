import { PrismaClient, Prisma } from '@prisma/client';
import { generateBadgeQrSecret } from '@/lib/qr/badge';

const prisma = new PrismaClient();

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

  const guardian = await createUser('guardian@example.com', 'Guardian Nova', {
    isVerified: true,
  });

  const kid = await createUser('kid@example.com', 'Kid Ranger', {
    isChild: true,
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
