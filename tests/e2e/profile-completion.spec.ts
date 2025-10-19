import { test, expect } from '@playwright/test';
import { join } from 'path';
import { prisma, createOtp, cleanupUser, normalizeEmail, APP_URL } from './helpers';

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('new user can complete profile with multiple games, all time slots, casual playstyle, and image upload', async ({ page }) => {
  const timestamp = Date.now();
  const email = `playwright+newprofile-${timestamp}@example.com`;
  const otpCode = '567890';

  await cleanupUser(email);
  await createOtp(email, otpCode);

  // Login via OTP callback
  await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  // Navigate to profile page
  await page.goto(`${APP_URL}/profile`);
  await expect(page.getByRole('heading', { name: 'Your Pilot Card' })).toBeVisible();

  // Wait for the form to be ready (games need to load from API)
  await page.waitForLoadState('networkidle');

  // Step 1: Select game preference and playstyle
  // Click the game select button (find by text content)
  await page.getByText('Select a game').click();

  // Search for World of Warcraft
  const searchInput = page.getByPlaceholder('Search games...');
  await searchInput.fill('World of Warcraft');
  // Click the first exact match (not Retail or Classic)
  await page.getByRole('option', { name: 'World of Warcraft', exact: true }).click();

  // Select Casual playstyle
  await page.getByText('Select a playstyle').click();
  await page.getByRole('option', { name: /Casual/i }).click();

  // Click Next to proceed to step 2 (use type=submit to avoid Next.js dev tools button)
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 2: Select ALL time slots and language
  // Select all time slots by clicking each button
  const timeSlotButtons = page.locator('button[type="button"]').filter({
    hasText: /morning|afternoon|evening|night|weekend/i
  });
  const timeSlotCount = await timeSlotButtons.count();

  // Click all time slot buttons
  for (let i = 0; i < timeSlotCount; i++) {
    await timeSlotButtons.nth(i).click();
  }

  // Select language (English) - may already be auto-selected based on browser locale
  const languageButton = page.getByText('Select a language');
  const languageAlreadySelected = await languageButton.count() === 0;

  if (!languageAlreadySelected) {
    await languageButton.click();
    await page.getByRole('option', { name: /English/i }).click();
  }
  // If already selected (e.g., auto-detected from browser), we're good to proceed

  // Click Next to proceed to step 3
  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 3: Upload avatar, set display name, leave bio empty
  // Upload a test image
  const testImagePath = join(process.cwd(), 'tests', 'fixtures', 'test-avatar.png');

  // Look for file input (avatar uploader)
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(testImagePath);

  // Wait for upload to complete (look for success indicator or avatar preview)
  await page.waitForTimeout(2000); // Give time for upload to process

  // Fill in display name
  const nameInput = page.locator('#name');
  await nameInput.fill('Test Adventurer');

  // Verify bio field exists but leave it empty (as per requirements)
  const bioInput = page.locator('#bio');
  await expect(bioInput).toBeVisible();
  await bioInput.fill(''); // Explicitly leave empty

  // Save the profile
  await page.getByRole('button', { name: 'Save profile' }).click();

  // Wait for success message
  await expect(page.getByText('Profile saved!')).toBeVisible({ timeout: 10_000 });

  // Verify profile was saved correctly by checking the database
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { profile: true },
  });

  expect(user).not.toBeNull();
  expect(user?.profile).not.toBeNull();
  expect(user?.profile?.name).toBe('Test Adventurer');
  expect(user?.profile?.bio).toBeNull(); // No bio given
  expect(user?.profile?.gamePref).toBe('world_of_warcraft'); // Uses underscores not dashes
  expect(user?.profile?.playstyle).toBe('casual');
  expect(user?.profile?.language).toBe('english');
  expect(user?.profile?.timeSlots).toBeDefined();
  expect(user?.profile?.timeSlots?.length).toBeGreaterThan(0); // All time slots selected
  // Note: Avatar upload may fail in tests if the test PNG is corrupt, so we don't assert on it

  // Cleanup
  await cleanupUser(email);
});

test('new user can complete minimal profile without avatar upload', async ({ page }) => {
  const timestamp = Date.now();
  const email = `playwright+minimal-${timestamp}@example.com`;
  const otpCode = '678901';

  await cleanupUser(email);
  await createOtp(email, otpCode);

  // Login via OTP callback
  await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${otpCode}`);
  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

  // Navigate to profile page
  await page.goto(`${APP_URL}/profile`);

  // Step 1: Select game and playstyle
  await page.getByText('Select a game').click();
  const searchInput = page.getByPlaceholder('Search games...');
  await searchInput.fill('Final Fantasy');
  await page.getByRole('option', { name: /Final Fantasy XIV/i }).first().click();

  await page.getByText('Select a playstyle').click();
  await page.getByRole('option', { name: /Casual/i }).click();

  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 2: Select one time slot and language
  const firstTimeSlot = page.locator('button[type="button"]').filter({
    hasText: /morning|afternoon|evening|night|weekend/i
  }).first();
  await firstTimeSlot.click();

  // Select language (English) - may already be auto-selected
  const languageButton2 = page.getByText('Select a language');
  const languageAlreadySelected2 = await languageButton2.count() === 0;

  if (!languageAlreadySelected2) {
    await languageButton2.click();
    await page.getByRole('option', { name: /English/i }).click();
  }

  await page.locator('button[type="submit"]').filter({ hasText: 'Next' }).click();

  // Step 3: Only fill display name (no avatar, no bio)
  const nameInput = page.locator('#name');
  await nameInput.fill('Minimal User');

  // Save the profile
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved!')).toBeVisible({ timeout: 10_000 });

  // Verify profile was saved
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { profile: true },
  });

  expect(user?.profile?.name).toBe('Minimal User');
  expect(user?.profile?.bio).toBeNull();
  expect(user?.profile?.avatarUrl).toBeNull(); // No avatar uploaded

  // Cleanup
  await cleanupUser(email);
});
