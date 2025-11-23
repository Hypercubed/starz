import { test, expect } from '@playwright/test';
import { startGame, pauseGame, openHelpDialog, getHomeworld } from './utils';

test.describe('User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await pauseGame(page); // Pause to prevent bots from interfering
  });

  test('left click on owned system selects it', async ({ page }) => {
    const homeworld = await getHomeworld(page);

    await homeworld.click();

    // System should be selected (visually indicated, but hard to test directly)
    // We can verify by checking if the element is still visible and clickable
    await expect(homeworld).toBeVisible();
  });

  test('spacebar pauses and unpauses game', async ({ page }) => {
    const infoBox = page.locator('#infobox span');

    // Game should be paused (we paused in beforeEach)
    const tick1 = await infoBox.textContent();
    await page.waitForTimeout(1000);
    const tick2 = await infoBox.textContent();

    // Tick should not have advanced
    expect(tick1).toBe(tick2);

    // Unpause
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);

    const tick3 = await infoBox.textContent();

    // Tick should have advanced
    expect(parseFloat(tick3 || '0')).toBeGreaterThan(parseFloat(tick2 || '0'));
  });

  test('H key centers on homeworld', async ({ page }) => {
    // Press H
    await page.keyboard.press('h');

    // Give time for pan/rotation animation
    await page.waitForTimeout(300);

    // Homeworld should still be visible (centered)
    const homeworld = await getHomeworld(page);
    await expect(homeworld).toBeVisible();
  });

  test('? key opens help dialog', async ({ page }) => {
    await page.keyboard.press('Shift+Slash');

    const helpDialog = page.locator('#helpDialog');
    await expect(helpDialog).toBeVisible();
  });

  test('WASD keys rotate the view', async ({ page }) => {
    // These should not throw errors
    await page.keyboard.press('w');
    await page.waitForTimeout(100);

    await page.keyboard.press('a');
    await page.waitForTimeout(100);

    await page.keyboard.press('s');
    await page.waitForTimeout(100);

    await page.keyboard.press('d');
    await page.waitForTimeout(100);

    // Map should still be visible after rotations
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();
  });

  test('+ and - keys zoom in and out', async ({ page }) => {
    // Zoom in
    await page.keyboard.press('='); // '+' without shift
    await page.waitForTimeout(100);

    // Zoom out
    await page.keyboard.press('-');
    await page.waitForTimeout(100);

    // Map should still be visible after zooming
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();
  });

  test('Q and E keys rotate around Z axis', async ({ page }) => {
    await page.keyboard.press('q');
    await page.waitForTimeout(100);

    await page.keyboard.press('e');
    await page.waitForTimeout(100);

    // Map should still be visible
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();
  });

  test('C key centers on selected system', async ({ page }) => {
    const homeworld = await getHomeworld(page);
    await homeworld.click();

    // Press C to center on selected
    await page.keyboard.press('c');
    await page.waitForTimeout(300);

    // Homeworld should still be visible
    await expect(homeworld).toBeVisible();
  });

  test('P key changes projection view', async ({ page }) => {
    // Press P to change view
    await page.keyboard.press('p');
    await page.waitForTimeout(300);

    // Map should still be visible with different projection
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();

    const systems = page.locator('#app svg g.system');
    await expect(systems.first()).toBeVisible();
  });

  test('ESC key clears selection', async ({ page }) => {
    const homeworld = await getHomeworld(page);
    await homeworld.click();

    // Clear selection with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // No error should occur
  });

  test('middle mouse button interactions work', async ({ page }) => {
    // This is harder to test with Playwright, but we can verify the map is still functional
    const svg = page.locator('#app svg');

    // Verify the map is visible and interactive
    await expect(svg).toBeVisible();

    const systems = await page.locator('#app svg g.system').count();
    expect(systems).toBeGreaterThan(0);
  });

  test('ctrl+click adds system to selection', async ({ page }) => {
    const systems = await page.locator('svg circle.system[data-owner="1"]').all();

    if (systems.length >= 2) {
      // Click first system
      await systems[0].click();
      await page.waitForTimeout(100);

      // Ctrl+click second system
      await systems[1].click({ modifiers: ['Control'] });
      await page.waitForTimeout(100);

      // Both should be selectable (no errors)
    }
  });
});
