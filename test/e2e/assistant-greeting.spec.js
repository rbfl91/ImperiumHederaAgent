import { test, expect } from '@playwright/test';

test.describe('Assistant Greeting', () => {

  test('assistant sends an initial greeting message', async ({ page }) => {
    await page.goto('/');

    // The greeting arrives via WebSocket streaming — wait for an agent message bubble
    const agentMessage = page.locator('.message--agent .message-bubble--agent');
    await expect(agentMessage.first()).toBeVisible({ timeout: 15_000 });

    // Greeting should contain meaningful text
    const text = await agentMessage.first().textContent();
    expect(text.length).toBeGreaterThan(10);
  });

  test('greeting shows IMPERIUM ASSISTANT sender label', async ({ page }) => {
    await page.goto('/');

    const senderLabel = page.locator('.message--agent .message-sender');
    await expect(senderLabel.first()).toBeVisible({ timeout: 15_000 });
    await expect(senderLabel.first()).toHaveText('IMPERIUM ASSISTANT');
  });

  test('quick-reply chips appear after greeting completes', async ({ page }) => {
    await page.goto('/');

    // Chips render after streaming ends
    const chipsContainer = page.locator('.suggestion-chips');
    await expect(chipsContainer).toBeVisible({ timeout: 20_000 });

    // Should have at least one chip
    const chips = chipsContainer.locator('.chip');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('quick-reply chips are clickable and enabled', async ({ page }) => {
    await page.goto('/');

    const chip = page.locator('.suggestion-chips .chip').first();
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await expect(chip).toBeEnabled();
  });
});
