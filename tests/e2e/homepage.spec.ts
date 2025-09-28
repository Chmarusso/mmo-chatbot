import { test, expect } from '@playwright/test';

test('homepage renders the hero content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/MMO Match/i);
  await expect(page.getByRole('heading', { name: /Squad up on MMO Match/i })).toBeVisible();
  await expect(page.getByText('Log in with a magic link')).toBeVisible();
});
