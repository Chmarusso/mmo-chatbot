import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function usage() {
  console.log("Usage: pnpm ts-node scripts/generate-guild-codes.ts <amount> [--creator-email=email@example.com]");
}

async function main() {
  const [, , amountArg, ...rest] = process.argv;

  if (!amountArg) {
    usage();
    process.exit(1);
  }

  const amount = Number(amountArg);

  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Amount must be a positive integer");
    process.exit(1);
  }

  let creatorProfileId: string | undefined;

  const creatorEmailArg = rest.find((arg) => arg.startsWith("--creator-email="));
  if (creatorEmailArg) {
    const email = creatorEmailArg.split("=")[1]?.trim().toLowerCase();
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.error(`User with email ${email} not found`);
        process.exit(1);
      }
      const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        console.error(`Profile for ${email} not found`);
        process.exit(1);
      }
      creatorProfileId = profile.id;
    }
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const codes = await prisma.$transaction(async (tx) => {
    const values = [] as { code: string; id: string }[];

    for (let i = 0; i < amount; i += 1) {
      let created;
      for (let attempts = 0; attempts < 5; attempts += 1) {
        const code = crypto.randomBytes(8).toString("hex").toUpperCase();
        try {
          created = await tx.guildCreationCode.create({
            data: {
              code,
              expiresAt,
              createdByProfileId: creatorProfileId,
            },
            select: {
              id: true,
              code: true,
            },
          });
          break;
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") {
            throw error;
          }
        }
      }

      if (!created) {
        throw new Error("Failed to generate unique code after multiple attempts");
      }

      values.push(created);
    }

    return values;
  });

  console.log(`Generated ${codes.length} guild creation code(s) (expires ${expiresAt.toISOString()})`);
  codes.forEach((entry) => console.log(entry.code));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
