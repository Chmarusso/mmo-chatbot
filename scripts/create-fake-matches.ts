import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  const targetProfileId = process.argv[2];
  const countArg = process.argv[3];
  const numberOfMatches = countArg ? Number.parseInt(countArg, 10) : 5;

  if (!targetProfileId) {
    console.error('Usage: pnpm tsx scripts/create-fake-matches.ts <profileId> [count]');
    process.exit(1);
  }

  const targetProfile = await prisma.profile.findUnique({ where: { id: targetProfileId } });
  if (!targetProfile) {
    console.error(`Profile ${targetProfileId} not found.`);
    process.exit(1);
  }

  console.log(`Creating ${numberOfMatches} fake matches for profile ${targetProfileId} (${targetProfile.name})`);

  const createdProfiles: string[] = [];

  for (let i = 0; i < numberOfMatches; i += 1) {
    const email = faker.internet.email({ firstName: faker.person.firstName(), lastName: faker.person.lastName() }).toLowerCase();
    const user = await prisma.user.create({
      data: {
        email,
        profile: {
          create: {
            name: faker.person.fullName(),
            bio: faker.lorem.sentence(),
            gamePref: targetProfile.gamePref,
            language: targetProfile.language,
            timeSlot: targetProfile.timeSlot,
            playstyle: targetProfile.playstyle,
          },
        },
      },
      include: { profile: true },
    });

    if (!user.profile) {
      continue;
    }

    createdProfiles.push(user.profile.id);

    const [user1Id, user2Id] = [targetProfileId, user.profile.id].sort();

    await prisma.match.upsert({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      update: {
        status: 'ACTIVE',
        requiresGuardianApproval: false,
      },
      create: {
        user1Id,
        user2Id,
        status: 'ACTIVE',
        requiresGuardianApproval: false,
      },
    });

    await prisma.message.create({
      data: {
        matchId: await (async () => {
          const match = await prisma.match.findUnique({
            where: { user1Id_user2Id: { user1Id, user2Id } },
            select: { id: true },
          });
          return match!.id;
        })(),
        senderId: user.profile.id,
        content: faker.lorem.sentence(),
      },
    });

    console.log(`→ Matched with ${user.profile.name} (${user.profile.id})`);
  }

  console.log(`Finished creating matches. Created ${createdProfiles.length} new profiles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
