import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const selectOption = async (page: Page, label: string, optionText: string | RegExp) => {
  const trigger = page.getByRole('combobox', { name: label }).first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.getByRole('option', { name: optionText }).click();
  await expect(trigger).toHaveText(optionText);
};
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const hashOtpCode = (code: string) =>
  crypto.createHash('sha256').update(code).digest('hex');

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createOtp = async (email: string, code: string) => {
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

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('user can log in via OTP and update their profile', async ({ page }) => {
  const uniqueSuffix = Date.now();
  const email = `playwright+${uniqueSuffix}@example.com`;
  const otpCode = '654321';

  await prisma.user.deleteMany({ where: { email: normalizeEmail(email) } });
  await createOtp(email, otpCode);

  await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);

  await page.waitForLoadState('networkidle');

  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });
  await expect(page.getByText('Complete profile')).toBeVisible();

  await page.goto('/profile');
  await expect(page.locator('#name')).toBeVisible();
  await page.fill('#name', 'Playwright Hero');
  await page.fill('#bio', 'Testing the realms of MMOPLAYA.');

  await selectOption(page, 'Preferred MMO', /Final Fantasy XIV/i);
  await selectOption(page, 'Time Slot (UTC)', /Weekends Evenings/i);
  await selectOption(page, 'Language', /English/i);
  await selectOption(page, 'Playstyle', /Casual/i);

  const saveResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/profile') && response.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Save profile' }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();
  await expect(page.getByText('Profile saved!')).toBeVisible();

  const stored = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { profile: true },
  });

  expect(stored?.profile).toMatchObject({
    name: 'Playwright Hero',
    bio: 'Testing the realms of MMOPLAYA.',
    gamePref: 'final_fantasy_xiv',
    timeSlot: 'weekends_evenings',
    language: 'english',
    playstyle: 'casual',
  });

  await prisma.user.deleteMany({ where: { email: normalizeEmail(email) } });
  await prisma.otpToken.deleteMany({ where: { email: normalizeEmail(email) } });
  await prisma.session.deleteMany({ where: { userId: stored?.id } });
  await prisma.profile.deleteMany({ where: { userId: stored?.id ?? '' } });
});
