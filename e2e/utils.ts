import { Page, Locator, expect } from '@playwright/test';

/**
 * Helper to start a new game by closing the start dialog
 */
export async function startGame(page: Page) {
  const startButton = page.locator('#startButton');
  await expect(startButton).toBeVisible();
  await startButton.click();

  // Wait for dialog to close
  const startDialog = page.locator('#startDialog');
  await expect(startDialog).not.toBeVisible();

  // Wait for map to initialize
  await waitForMapGeneration(page);
}

/**
 * Wait for the map to be fully generated and rendered
 */
export async function waitForMapGeneration(page: Page) {
  // Wait for SVG container to be present
  await page.waitForSelector('#app svg', { state: 'attached' });

  // Wait for systems to be rendered (circles)
  await page.waitForSelector('#app svg g.system', { state: 'attached', timeout: 10000 });

  // Give a moment for D3 transitions to complete
  await page.waitForTimeout(500);
}

/**
 * Get all visible systems on the map
 */
export async function getAllSystems(page: Page): Promise<Locator[]> {
  const systems = await page.locator('#app svg g.system').all();
  return systems;
}

/**
 * Get all visible systems owned by a specific player
 */
export async function getSystemsByOwner(page: Page, owner: number): Promise<Locator[]> {
  const systems = await page.locator(`#app svg g.system[data-owner="${owner}"]`).all();
  return systems;
}

/**
 * Get the player's homeworld (first system, owner 1)
 */
export async function getHomeworld(page: Page): Promise<Locator> {
  const homeworld = page.locator('#app svg g.system[data-owner="1"]').first();
  await expect(homeworld).toBeVisible();
  return homeworld;
}

/**
 * Select a system by clicking on it
 */
export async function selectSystem(page: Page, system: Locator) {
  await system.click();
  await page.waitForTimeout(100); // Brief wait for selection to register
}

/**
 * Move ships from one system to another via right-click
 */
export async function moveShips(page: Page, fromSystem: Locator, toSystem: Locator) {
  await fromSystem.click(); // Select source
  await page.waitForTimeout(100);
  await toSystem.click({ button: 'right' }); // Right click to move
  await page.waitForTimeout(100);
}

/**
 * Wait for a game tick to advance
 */
export async function waitForTick(page: Page, currentTick: number) {
  const infoBox = page.locator('#infobox span');

  // Wait for tick to increment
  await expect(async () => {
    const text = await infoBox.textContent();
    const tick = parseFloat(text || '0');
    expect(tick).toBeGreaterThan(currentTick);
  }).toPass({ timeout: 3000 });
}

/**
 * Get current game tick
 */
export async function getCurrentTick(page: Page): Promise<number> {
  const infoBox = page.locator('#infobox span');
  const text = await infoBox.textContent();
  return parseFloat(text || '0');
}

/**
 * Pause the game using spacebar
 */
export async function pauseGame(page: Page) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
}

/**
 * Open the help dialog
 */
export async function openHelpDialog(page: Page) {
  const helpButton = page.locator('#helpButton');
  await helpButton.click();

  const helpDialog = page.locator('#helpDialog');
  await expect(helpDialog).toBeVisible();
}

/**
 * Close the help dialog
 */
export async function closeHelpDialog(page: Page) {
  const helpDialog = page.locator('#helpDialog');
  const exitButton = helpDialog.locator('button');
  await exitButton.scrollIntoViewIfNeeded();
  await exitButton.click();

  await expect(helpDialog).not.toBeVisible();
}

/**
 * Get leaderboard data
 */
export async function getLeaderboardData(page: Page) {
  const rows = await page.locator('#leaderbox tbody tr').all();
  const data = [];

  for (const row of rows) {
    const cells = await row.locator('td').allTextContents();
    data.push({
      player: parseInt(cells[0], 10),
      systems: parseInt(cells[1], 10),
      ships: parseInt(cells[2], 10),
    });
  }

  return data;
}

/**
 * Get recent messages from the message box
 */
export async function getRecentMessages(page: Page): Promise<string[]> {
  const messages = await page.locator('#messagebox div').allTextContents();
  return messages;
}
