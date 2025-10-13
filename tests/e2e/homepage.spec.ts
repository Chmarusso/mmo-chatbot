import { test, expect } from '@playwright/test';

test('homepage renders the hero content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/MMOPLAYA/i);
  await expect(page.getByRole('heading', { name: /Squad up on MMOPLAYA/i })).toBeVisible();
  await expect(page.getByText('Log in with a magic link')).toBeVisible();
});
