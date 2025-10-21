import { test, expect } from '@playwright/test';
import { prisma, createOtp, normalizeEmail, APP_URL } from './helpers';

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('user can complete companion chat onboarding with invite code', async ({ page }) => {
  const timestamp = Date.now();
  const email = `playwright+companion-${timestamp}@example.com`;
  const name = 'Companion Tester';
  const otp = '123456';
  const inviteCode = `COMP${timestamp}`;

  const cleanup = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);

      // Delete user and let cascade take care of everything else
      await prisma.otpToken.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
    } catch (error) {
      console.log('Cleanup error (non-fatal):', error);
    }
  };

  await cleanup();

  try {
    // Create user with minimal profile (no games, playstyle, or timeslots)
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(email),
        profile: {
          create: {
            name: name,
            isVerified: true,
            isChild: false,
            inviteCode: inviteCode,
            // Intentionally leave gamePref, playstyle, and timeSlot empty to trigger onboarding
          },
        },
      },
      include: { profile: true },
    });

    // Create OTP for login
    await createOtp(email, otp);

    // Login
    await page.goto(`${APP_URL}/auth/login`);
    await page.fill('input[type="email"]', email);
    await page.check('input[type="checkbox"]'); // Accept terms
    await page.click('button:has-text("Let me in")');

    // Wait for OTP input and submit
    await page.waitForSelector('input#otp', { timeout: 5000 });
    await page.fill('input#otp', otp);
    await page.click('button:has-text("Verify code")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to companion page
    await page.goto(`${APP_URL}/companion`);

    // Wait for the companion chat to load
    await expect(page.getByText('Companion Intel')).toBeVisible({ timeout: 10000 });

    // Check that onboarding form is shown
    await expect(page.getByText(/Let's tune your pilot card/i)).toBeVisible();
    await expect(page.getByText(/Core MMOs/i)).toBeVisible();

    // Select multiple games (using exact role selectors)
    const gameButtons = [
      'Guild Wars 2',
      'Final Fantasy XIV',
      'Lost Ark',
    ];

    for (const gameName of gameButtons) {
      await page.getByRole('button', { name: gameName, exact: true }).click();
    }

    // Verify games are selected (should have cyan styling)
    for (const gameName of gameButtons) {
      const button = page.getByRole('button', { name: gameName, exact: true });
      await expect(button).toHaveClass(/accent-cyan/);
    }

    // Select playstyle
    await page.getByRole('button', { name: 'Casual', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Casual', exact: true })).toHaveClass(/accent-cyan/);

    // Select multiple time slots
    const timeSlots = [
      'Weekend mornings (08:00-12:00)',
      'Weekday evenings (17:00-21:00)'
    ];
    for (const timeSlot of timeSlots) {
      await page.getByRole('button', { name: timeSlot, exact: true }).click();
    }

    // Verify time slots are selected
    for (const timeSlot of timeSlots) {
      const button = page.getByRole('button', { name: timeSlot, exact: true });
      await expect(button).toHaveClass(/accent-cyan/);
    }

    // Submit the form
    await page.click('button:has-text("Save and continue")');

    // Wait for success message
    await expect(page.getByText(/Profile basics saved/i)).toBeVisible({ timeout: 10000 });

    // Verify onboarding form is gone and companion message appears
    await expect(page.getByText(/Profile intel locked in/i)).toBeVisible({ timeout: 5000 });

    // Verify chat input is now available
    await expect(page.getByPlaceholder(/Ask for build advice/i)).toBeVisible();

    // Verify profile was updated in the database
    const updatedProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    expect(updatedProfile).not.toBeNull();
    expect(updatedProfile?.gamePreferences).toHaveLength(3);
    expect(updatedProfile?.gamePreferences).toContain('guild_wars_2');
    expect(updatedProfile?.gamePreferences).toContain('final_fantasy_xiv');
    expect(updatedProfile?.gamePreferences).toContain('lost_ark');
    expect(updatedProfile?.playstyle).toBe('casual');
    expect(updatedProfile?.timeSlots).toHaveLength(2);
    expect(updatedProfile?.gamePref).toBe('guild_wars_2'); // First selected game
    expect(updatedProfile?.timeSlot).toBeTruthy(); // First selected time slot

  } finally {
    await cleanup();
  }
});
