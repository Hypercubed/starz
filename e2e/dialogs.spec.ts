import { test, expect } from '@playwright/test';

import { startGame, openHelpDialog, closeHelpDialog } from './utils';

test.describe('Dialog Interactions', () => {
  test('start dialog displays correct content', async ({ page }) => {
    await page.goto('/');

    const startDialog = page.locator('#startDialog');

    // Check for lore text
    await expect(startDialog).toContainText('The Bubble');
    await expect(startDialog).toContainText('Commander');
    await expect(startDialog).toContainText('Good luck');
  });

  test('start button closes dialog and starts game', async ({ page }) => {
    await page.goto('/');

    const startDialog = page.locator('#startDialog');
    await expect(startDialog).toBeVisible();

    const startButton = page.locator('#startButton');
    await startButton.click();

    // Dialog should close
    await expect(startDialog).not.toBeVisible();

    // Game should be running (map visible)
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();
  });

  test('help dialog opens when clicking help button', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    await openHelpDialog(page);

    const helpDialog = page.locator('#helpDialog');
    await expect(helpDialog).toBeVisible();
  });

  test('help dialog displays game instructions', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    await openHelpDialog(page);

    const helpDialog = page.locator('#helpDialog');

    // Check for key content sections
    await expect(helpDialog).toContainText('Introduction');
    await expect(helpDialog).toContainText('Gameplay');
    await expect(helpDialog).toContainText('Objective');
    await expect(helpDialog).toContainText('hyperspace lanes');
  });

  test('help dialog can be closed via exit button', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    await openHelpDialog(page);

    const helpDialog = page.locator('#helpDialog');
    await expect(helpDialog).toBeVisible();

    await closeHelpDialog(page);

    await expect(helpDialog).not.toBeVisible();
  });

  test('help dialog can be opened via keyboard shortcut', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    // Press '?' to open help
    await page.keyboard.press('Shift+Slash'); // '?' is Shift + /

    const helpDialog = page.locator('#helpDialog');
    await expect(helpDialog).toBeVisible();
  });

  test('start dialog has correct button text', async ({ page }) => {
    await page.goto('/');

    const startButton = page.locator('#startButton');
    await expect(startButton).toHaveText('Start');
  });

  test('help dialog has exit button', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    await openHelpDialog(page);

    const helpDialog = page.locator('#helpDialog');
    const exitButton = helpDialog.locator('button');

    await expect(exitButton).toBeVisible();
    await expect(exitButton).toHaveText('Exit');
  });

  test('help dialog contains github link', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    await openHelpDialog(page);

    const helpDialog = page.locator('#helpDialog');
    const githubLink = helpDialog.locator('a[href*="github"]');

    await expect(githubLink).toBeVisible();
  });
});
