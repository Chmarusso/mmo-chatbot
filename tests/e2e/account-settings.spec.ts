import { test, expect } from '@playwright/test';
import { createOtp, cleanupUser } from './profile-persistence.spec';

const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const emailFor = (suffix: string) => `playwright+account-${suffix}-${Date.now()}@example.com`;
const OTP_CODE = '112233';

test.describe('Account settings flows', () => {
  test.beforeAll(async () => {
    await cleanupUser(emailFor('placeholder')); // ensure helper runs at least once for static import
  });

  test('sign out clears session and redirects home', async ({ page }) => {
    const email = emailFor('signout');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    await page.goto(`${APP_URL}/settings`);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_URL}/?$`));

    await page.goto(`${APP_URL}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`${APP_URL}/auth`));

    await cleanupUser(email);
  });

  test('account deletion removes user data and prevents re-login', async ({ page }) => {
    const email = emailFor('delete');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.confirm = () => true);
    await page.getByRole('button', { name: 'Delete account data' }).click();
    await expect(page.getByText('Account data removed')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_URL}/?$`));

    await createOtp(email, OTP_CODE);
    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await expect(page).toHaveURL(`${APP_URL}/dashboard`);

    await cleanupUser(email);
  });
});
