import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

export const prisma = new PrismaClient();

// Get the app URL, respecting PORT environment variable
const PORT = process.env.PORT ?? '3000';
const HOST = process.env.HOST ?? 'localhost';
export const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;

export const hashOtpCode = (code: string) =>
  createHash('sha256').update(code).digest('hex');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const createOtp = async (email: string, code: string) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: { email: normalizedEmail },
    update: {},
    select: { id: true },
  });

  await prisma.otpToken.deleteMany({ where: { email: normalizedEmail } });
  await prisma.otpToken.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      tokenHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
};

export const cleanupUser = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });
  if (!user) return;
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.profile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};
