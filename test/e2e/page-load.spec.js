import { test, expect } from '@playwright/test';

test.describe('Page Load', () => {

  test('page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Imperium Markets Agent');
  });

  test('header renders with brand name and logo', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    await expect(header.locator('.header-title')).toHaveText('Imperium Markets Agent');
    await expect(header.locator('.header-logo svg')).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('.header-nav');
    await expect(nav.locator('a')).toHaveCount(3);
    await expect(nav.locator('a').nth(0)).toHaveText('Market Rates');
    await expect(nav.locator('a').nth(1)).toHaveText('How it works');
    await expect(nav.locator('a').nth(2)).toHaveText('Support');
  });

  test('chat panel renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.chat-panel')).toBeVisible();
  });

  test('chat input is present and has placeholder', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('.chat-input input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Type your response here...');
  });

  test('deal progress sidebar renders', async ({ page }) => {
    await page.goto('/');
    const progress = page.locator('.rfq-progress');
    await expect(progress).toBeVisible();
    await expect(page.locator('.rfq-progress-title')).toHaveText('DEAL PROGRESS');
  });

  test('wallet panel renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.wallet-panel')).toBeVisible();
  });
});
