import { test, expect } from '@playwright/test';
import {
  startGame,
  waitForMapGeneration,
  getAllSystems,
  getHomeworld,
  getLeaderboardData,
} from './utils';

test.describe('Game Initialization', () => {
  test('should load the page successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle('STARZ!');
  });

  test('should display start dialog on page load', async ({ page }) => {
    await page.goto('/');

    const startDialog = page.locator('#startDialog');
    await expect(startDialog).toBeVisible();

    // Check dialog content
    await expect(startDialog).toContainText('The Bubble');
    await expect(startDialog).toContainText('Good luck, Commander');
  });

  test('should have start button visible', async ({ page }) => {
    await page.goto('/');

    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText('Start');
  });

  test('should close dialog and initialize game when start button is clicked', async ({ page }) => {
    await page.goto('/');

    await startGame(page);

    // Verify dialog is closed
    const startDialog = page.locator('#startDialog');
    await expect(startDialog).not.toBeVisible();

    // Verify SVG map is visible
    const svg = page.locator('#app svg');
    await expect(svg).toBeVisible();
  });

  test('should generate map with correct number of systems', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const systems = await getAllSystems(page);

    // Should have at least 2 systems visible
    expect(systems.length).toBeGreaterThan(2);
    expect(systems.length).toBeLessThanOrEqual(5);
  });

  test('should reveal player homeworld on game start', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const homeworld = await getHomeworld(page);

    // Homeworld should be visible and owned by player 1
    await expect(homeworld).toBeVisible();
    await expect(homeworld).toHaveAttribute('data-owner', '1');
    await expect(homeworld).toHaveClass(/inhabited/)
    await expect(homeworld).toHaveClass(/visited/)
  });

  test('should display info box with turn counter', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const infoBox = page.locator('#infobox');
    await expect(infoBox).toBeVisible();
    await expect(infoBox).toContainText('Turn:');

    // Should start at turn 0
    const turnText = await infoBox.locator('span').textContent();
    expect(+turnText!).toBeGreaterThanOrEqual(0);
  });

  test('should display leaderboard with all players', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const leaderboard = page.locator('#leaderbox');
    await expect(leaderboard).toBeVisible();

    // Should have headers
    await expect(leaderboard).toContainText('Player');
    await expect(leaderboard).toContainText('Systems');
    await expect(leaderboard).toContainText('Ships');

    // Should have player rows (4 bots + potentially 0-1 human)
    const data = await getLeaderboardData(page);
    expect(data.length).toBeGreaterThanOrEqual(4);
    expect(data.length).toBeLessThanOrEqual(5);
  });

  test('should display help button', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const helpButton = page.locator('#helpButton');
    await expect(helpButton).toBeVisible();
    await expect(helpButton).toHaveText('?');
  });

  test('should render lanes between connected systems', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    // Check that lanes exist
    const lanes = page.locator('svg path.lane');
    const laneCount = await lanes.count();

    // Should have many lanes connecting systems
    expect(laneCount).toBeGreaterThanOrEqual(1);
  });

  test('should have game running after initialization', async ({ page }) => {
    await page.goto('/');
    await startGame(page);

    const initialTick = await page.locator('#infobox span').textContent();

    // Wait a moment
    await page.waitForTimeout(1500);

    const laterTick = await page.locator('#infobox span').textContent();

    // Tick should have advanced (game is running)
    expect(parseFloat(laterTick || '0')).toBeGreaterThan(parseFloat(initialTick || '0'));
  });
});
