import { PrismaClient } from "@prisma/client";
import { generateInviteCode } from "@/lib/invite";

const prisma = new PrismaClient();

function usage() {
  console.log("Usage: pnpm generate:invites <amount> [--prefix=INVITE] [--length=6] [--max-uses=1]");
}

async function main() {
  const [, , amountArg, ...rest] = process.argv;

  if (!amountArg) {
    usage();
    process.exit(1);
  }

  const amount = Number(amountArg);
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Amount must be a positive integer.");
    process.exit(1);
  }

  let prefix: string | undefined;
  let length: number | undefined;
  let maxUses = 1;

  for (const arg of rest) {
    if (arg.startsWith("--prefix=")) {
      const value = arg.split("=")[1];
      if (value) {
        prefix = value;
      }
    }
    if (arg.startsWith("--length=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isInteger(value) && value > 0 && value <= 16) {
        length = value;
      }
    }
    if (arg.startsWith("--max-uses=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isInteger(value) && value > 0) {
        maxUses = value;
      }
    }
  }

  const generatedCodes: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < amount; index += 1) {
      let createdCode: string | undefined;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = generateInviteCode({ prefix, length });

        try {
          await tx.inviteCode.create({
            data: {
              code: candidate,
              maxUses: maxUses,
            },
          });
          createdCode = candidate;
          break;
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") {
            throw error;
          }
        }
      }

      if (!createdCode) {
        throw new Error("Failed to generate a unique invite code after several attempts.");
      }

      generatedCodes.push(createdCode);
    }
  });

  console.log(`Generated ${generatedCodes.length} invite code(s):`);
  generatedCodes.forEach((code) => console.log(code));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
