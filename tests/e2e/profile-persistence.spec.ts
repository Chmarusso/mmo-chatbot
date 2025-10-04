import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const hashOtpCode = (code: string) =>
  crypto.createHash('sha256').update(code).digest('hex');

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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

const selectOption = async (page: Page, label: string, optionText: string | RegExp) => {
  const trigger = page.getByRole('combobox', { name: label }).first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.getByRole('option', { name: optionText }).click();
  await expect(trigger).toHaveText(optionText);
};

export const cleanupUser = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (!user) return;
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.profile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
};

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('profile changes persist across sessions', async ({ page, browser }) => {
  const timestamp = Date.now();
  const email = `playwright+persistence-${timestamp}@example.com`;
  const otpCode = '345678';

  await cleanupUser(email);
  await createOtp(email, otpCode);

  await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  await page.goto(`${APP_URL}/profile`);

  await page.fill('#name', 'Persist Tester');
  await page.fill('#bio', 'Saving this bio to confirm persistence.');

  await selectOption(page, 'Preferred MMO', /Final Fantasy XIV/i);
  await selectOption(page, 'Playstyle', /Casual/i);
  await selectOption(page, 'Time Slot', /Weekday evenings/i);
  await selectOption(page, 'Language', /English/i);

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved!')).toBeVisible();

  await prisma.session.deleteMany({ where: { user: { email: normalizeEmail(email) } } });

  await createOtp(email, otpCode);

  const context = await browser.newContext();
  const page2 = await context.newPage();
  await page2.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page2.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  await page2.goto(`${APP_URL}/profile`);

  await expect(page2.locator('#name')).toHaveValue('Persist Tester');
  await expect(page2.locator('#bio')).toHaveValue('Saving this bio to confirm persistence.');
  await expect(page2.getByRole('combobox', { name: 'Preferred MMO' })).toHaveText(/Final Fantasy XIV/i);
  await expect(page2.getByRole('combobox', { name: 'Playstyle' })).toHaveText(/Casual/i);
  await expect(page2.getByRole('combobox', { name: 'Time Slot' })).toHaveText(/Weekday evenings/i);
  await expect(page2.getByRole('combobox', { name: 'Language' })).toHaveText(/English/i);

  await context.close();
  await cleanupUser(email);
});
