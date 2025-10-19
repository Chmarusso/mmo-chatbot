import { test, expect, type Page } from '@playwright/test';
import { prisma, createOtp, normalizeEmail, APP_URL } from './helpers';

const selectGameOrPlaystyle = async (page: Page, placeholder: string, optionText: string | RegExp) => {
  await page.getByText(placeholder).click();
  await page.getByRole('option', { name: optionText }).click();
};

const selectLanguage = async (page: Page, optionText: string | RegExp) => {
  const languageButton = page.getByText('Select a language');
  const languageAlreadySelected = await languageButton.count() === 0;

  if (!languageAlreadySelected) {
    await languageButton.click();
    await page.getByRole('option', { name: optionText }).click();
  }
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
  await page.waitForLoadState('networkidle');

  // Step 0: Select game and playstyle
  await selectGameOrPlaystyle(page, 'Select a game', /Final Fantasy XIV/i);
  await selectGameOrPlaystyle(page, 'Select a playstyle', /Casual/i);
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 1: Select time slot and language
  await page.getByRole('button', { name: /Weekend evenings/i }).click();
  await selectLanguage(page, /English/i);
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 2: Fill name and bio
  await expect(page.locator('#name')).toBeVisible();
  await page.fill('#name', 'Playwright Hero');
  await page.fill('#bio', 'Testing the realms of MMOPLAYA.');

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
    language: 'english',
    playstyle: 'casual',
  });
  expect(stored?.profile?.timeSlots).toContain('weekends_evenings');

  await prisma.user.deleteMany({ where: { email: normalizeEmail(email) } });
  await prisma.otpToken.deleteMany({ where: { email: normalizeEmail(email) } });
  await prisma.session.deleteMany({ where: { userId: stored?.id } });
  await prisma.profile.deleteMany({ where: { userId: stored?.id ?? '' } });
});
