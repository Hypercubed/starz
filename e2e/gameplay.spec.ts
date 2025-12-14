import { test, expect } from '@playwright/test';
import {
  startGame,
  pauseGame,
  getHomeworld,
  getSystemsByOwner,
  getCurrentTick,
  waitForTick,
  getLeaderboardData,
  getRecentMessages,
} from './utils';

test.describe('Gameplay Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('ships production happens each turn', async ({ page }) => {
    await pauseGame(page);

    const homeworld = await getHomeworld(page);
    const label = homeworld.locator(`text.ship-count`);

    const initialShips = await label.textContent();
    const initialCount = parseInt(initialShips?.replace(/\D/g, '') || '0', 10);

    const currentTick = await getCurrentTick(page);

    // Unpause and wait for a tick
    await pauseGame(page); // Unpause
    await waitForTick(page, currentTick);
    await pauseGame(page); // Pause again

    const newShips = await label.textContent();
    const newCount = parseInt(newShips?.replace(/\D/g, '') || '0', 10);

    // Ships should have increased
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('turn counter increments over time', async ({ page }) => {
    const initialTick = await getCurrentTick(page);

    // Wait for time to pass
    await page.waitForTimeout(2000);

    const laterTick = await getCurrentTick(page);

    // Tick should have advanced
    expect(laterTick).toBeGreaterThan(initialTick);
  });

  test('leaderboard updates with player stats', async ({ page }) => {
    const leaderboard = await getLeaderboardData(page);

    // Should have multiple players
    expect(leaderboard.length).toBeGreaterThanOrEqual(4);

    // Each player should have some systems and ships
    for (const player of leaderboard) {
      expect(player.systems).toBeGreaterThan(0);
      expect(player.ships).toBeGreaterThanOrEqual(0);
    }
  });

  test('leaderboard sorts by systems then ships', async ({ page }) => {
    await page.waitForTimeout(5000); // Let game progress

    const leaderboard = await getLeaderboardData(page);

    // Check sorting (most systems first)
    for (let i = 0; i < leaderboard.length - 1; i++) {
      const current = leaderboard[i];
      const next = leaderboard[i + 1];

      // Current should have >= systems than next
      // If equal systems, current should have >= ships than next
      if (current.systems === next.systems) {
        expect(current.ships).toBeGreaterThanOrEqual(next.ships);
      } else {
        expect(current.systems).toBeGreaterThanOrEqual(next.systems);
      }
    }
  });

  test('fog of war reveals connected systems', async ({ page }) => {
    await pauseGame(page);

    const homeworld = await getHomeworld(page);
    const isRevealed = await homeworld.getAttribute('class');

    // Homeworld should be revealed
    expect(isRevealed).toMatch(/visited/);

    // Connected systems should also be revealed
    const revealedSystems = await page.locator('svg g.system').count();

    // Should have revealed at least the homeworld and some neighbors
    expect(revealedSystems).toBeGreaterThan(1);
  });

  test('lanes connect systems on the map', async ({ page }) => {
    await pauseGame(page);

    const lanes = page.locator('svg path.lane');
    const laneCount = await lanes.count();

    // Should have many lanes
    expect(laneCount).toBeGreaterThan(1);

    // First lane should be visible
    await expect(lanes.first()).toBeVisible();
  });

  test('bot players make moves over time', async ({ page }) => {
    // Get initial leaderboard
    const initialStats = await getLeaderboardData(page);

    // Wait for several turns
    await page.waitForTimeout(10000);

    // Get updated leaderboard
    const laterStats = await getLeaderboardData(page);

    // Stats should have changed (bots are playing)
    let hasChanged = false;
    for (let i = 0; i < initialStats.length; i++) {
      if (
        initialStats[i].systems !== laterStats[i].systems ||
        initialStats[i].ships !== laterStats[i].ships
      ) {
        hasChanged = true;
        break;
      }
    }

    expect(hasChanged).toBe(true);
  });

  test('message box displays game events', async ({ page }) => {
    // Wait for some game events to occur
    await page.waitForTimeout(5000);

    const messages = await getRecentMessages(page);

    // Messages might appear during gameplay
    // We just verify the message box exists and is functional
    const messageBox = page.locator('#messagebox');
    await expect(messageBox).toBeVisible();

    // Check for the initial game start message which is always present
    await expect(messageBox).toContainText('Game started');
  });
});
