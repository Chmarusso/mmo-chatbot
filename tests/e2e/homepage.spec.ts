import { test, expect } from '@playwright/test';

test('homepage renders the hero content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/MMOPLAYA/i);
  await expect(page.getByRole('heading', { name: /Squad up on MMOPLAYA/i })).toBeVisible();
  await expect(page.getByText('Log in with a magic link')).toBeVisible();
  const loginLink = page.getByRole('link', { name: /Go to login/i });
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute('href', expect.stringContaining('/auth/login'));
});

test('login page renders the passwordless form', async ({ page }) => {
  await page.goto('/auth/login');

  await expect(page).toHaveTitle(/Log in | MMOPLAYA/i);
  await expect(page.getByText(/Enter your email to receive code or login link/i)).toBeVisible();
  await expect(page.getByPlaceholder('you@ProbablyGmail.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /Let me in/i })).toBeVisible();
});
