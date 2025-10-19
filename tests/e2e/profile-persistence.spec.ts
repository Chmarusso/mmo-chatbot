import { test, expect, type Page } from '@playwright/test';
import { prisma, createOtp, cleanupUser, normalizeEmail, APP_URL } from './helpers';

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

test('profile changes persist across sessions', async ({ page, browser }) => {
  const timestamp = Date.now();
  const email = `playwright+persistence-${timestamp}@example.com`;
  const otpCode = '345678';

  await cleanupUser(email);
  await createOtp(email, otpCode);

  await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  await page.goto(`${APP_URL}/profile`);
  await page.waitForLoadState('networkidle');

  // Step 0: Select game and playstyle
  await selectGameOrPlaystyle(page, 'Select a game', /Final Fantasy XIV/i);
  await selectGameOrPlaystyle(page, 'Select a playstyle', /Casual/i);
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 1: Select time slot and language
  await page.getByRole('button', { name: /Weekday evenings/i }).click();
  await selectLanguage(page, /English/i);
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 2: Fill name and bio
  await page.fill('#name', 'Persist Tester');
  await page.fill('#bio', 'Saving this bio to confirm persistence.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved!')).toBeVisible();

  await prisma.session.deleteMany({ where: { user: { email: normalizeEmail(email) } } });

  await createOtp(email, otpCode);

  const context = await browser.newContext();
  const page2 = await context.newPage();
  await page2.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page2.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  await page2.goto(`${APP_URL}/profile`);

  // Verify profile data persisted in database
  const persistedProfile = await prisma.profile.findFirst({
    where: { user: { email: normalizeEmail(email) } },
  });

  expect(persistedProfile).toMatchObject({
    name: 'Persist Tester',
    bio: 'Saving this bio to confirm persistence.',
    gamePref: 'final_fantasy_xiv',
    language: 'english',
    playstyle: 'casual',
  });
  expect(persistedProfile?.timeSlots).toContain('weekdays_evenings');

  await context.close();
  await cleanupUser(email);
});
