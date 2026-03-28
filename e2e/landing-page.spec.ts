import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load and display page title containing ReplyWise', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ReplyWise/i);
  });

  test('should display hero text', async ({ page }) => {
    await page.goto('/');
    // Hero section should be visible with main heading
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
  });

  test('should have a "Start Free Today" or "免費開始" button', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page.getByRole('link', { name: /Start Free Today|免費開始/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test('should navigate to pricing section via nav link', async ({ page }) => {
    await page.goto('/');
    const pricingLink = page.getByRole('link', { name: /Pricing|定價/i }).first();
    await expect(pricingLink).toBeVisible();
    await pricingLink.click();
    // After clicking, pricing section or /pricing page should be visible
    await expect(page.getByText(/Simple, Transparent Pricing|簡單透明的定價/i).first()).toBeVisible();
  });

  test('should display 3 pricing tiers (Free, Starter, Pro)', async ({ page }) => {
    await page.goto('/');
    // Scroll to pricing section
    await page.getByText(/Simple, Transparent Pricing|簡單透明的定價/i).first().scrollIntoViewIfNeeded();
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Starter').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
  });

  test('should have footer links for Privacy and Terms', async ({ page }) => {
    await page.goto('/');
    const privacyLink = page.getByRole('link', { name: /Privacy Policy|隱私政策/i });
    const termsLink = page.getByRole('link', { name: /Terms of Service|服務條款/i });
    await expect(privacyLink.first()).toBeVisible();
    await expect(termsLink.first()).toBeVisible();
  });
});
