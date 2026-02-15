import { test, expect } from '@playwright/test';

test('signin page renders', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: /Work Clarity/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue with Google/i })).toBeVisible();
});
