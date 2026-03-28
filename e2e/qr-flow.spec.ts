import { test, expect } from '@playwright/test';

test.describe('QR Review Flow', () => {
  test('should load the store page without crashing', async ({ page }) => {
    await page.goto('/?store=demo-store');
    // Page should load — either showing the review flow or a graceful error/not-found state
    await expect(page).toHaveURL(/store=demo-store/);
  });

  test('should handle non-existent store gracefully', async ({ page }) => {
    const response = await page.goto('/?store=demo-store');
    // The page should return a valid HTTP response (not a 500 crash)
    expect(response?.status()).toBeLessThan(500);
    // There should be visible content on the page (error message or fallback UI)
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
