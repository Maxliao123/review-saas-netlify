import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test('should load the pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing|ReplyWise/i);
  });

  test('should display all four pricing tier cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Starter').first()).toBeVisible();
    await expect(page.getByText('$29').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('$79').first()).toBeVisible();
    await expect(page.getByText('Enterprise').first()).toBeVisible();
    await expect(page.getByText('$199').first()).toBeVisible();
  });

  test('should have CTA buttons for each tier', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('link', { name: /Get Started Free/i })).toBeVisible();
    const trialButtons = page.getByRole('link', { name: /Start 14-Day Free Trial/i });
    await expect(trialButtons.first()).toBeVisible();
    // There should be at least 2 trial buttons (Starter, Pro, Enterprise)
    expect(await trialButtons.count()).toBeGreaterThanOrEqual(2);
  });
});
