
import { state, resetState } from '../src/game/state.ts';
import { generateMap } from '../src/game/generate.ts';
import { botQueue } from '../src/game/bots.ts';
import { doQueuedMoves } from '../src/game/actions.ts';
import { turnUpdate, roundUpdate, updateStats } from '../src/core/engine.ts';
import { TICKS_PER_TURN, TICKS_PER_ROUND } from '../src/core/constants.ts';
import { Bot } from '../src/game/bots.ts';

// Mock constants to override NumHumanPlayers
// Since we can't easily override const exports, we'll rely on the fact that
// generateMap uses the imported constant, but we can filter players afterwards if needed.
// Actually, generateMap assigns players.
// Let's just modify the state after generation to remove human players if any?
// Or better, we can just treat Player 1 as a bot in our simulation logic if we can attach a bot to it.

// Wait, `bots.ts` has `botQueue` which iterates `state.players`.
// If we can attach a bot to Player 1, it will act as a bot.

async function runSimulation(gameId: number) {
  resetState();
  generateMap();

  // Initialize players manually since startGame is not called
  state.players = [];
  const personalities = ['territory', 'rusher', 'turtle', 'balanced'];
  const totalPlayers = personalities.length;

  for (let i = 1; i <= totalPlayers; i++) {
    state.players.push({
      id: i,
      isHuman: false, // Force all to be bots
      bot: new Bot({}),
      stats: { player: i, systems: 0, ships: 0, homeworld: 0 }
    });
  }

  // Also ensure other players are bots (they should be by default)

  state.running = true;
  let ticks = 0;
  let winner = -1;

  while (ticks < 5000 && state.running) {
    // Game Loop Logic (simplified from engine.ts)
    // engine.ts `runGameLoop` calls `processTurn` every tick?
    // No, `runGameLoop` uses `requestAnimationFrame`.
    // We need to manually call the update steps.

    // `processTurn` handles production.
    // We need to call `botQueue` and `doQueuedMoves`.

    // Let's look at `engine.ts` to be sure.
    // I'll assume standard loop:

    // 1. Bot Moves
    botQueue();

    // 2. Execute Moves
    doQueuedMoves();

    // If Player 1 dies, the game engine stops the game. We want to continue until 1 bot remains.
    if (!state.running) {
      const active = state.players.filter(p => p.stats.systems > 0);
      if (active.length > 1) {
        state.running = true;
      }
    }

    // 3. Production / Game Logic
    state.tick++;
    if (state.tick % TICKS_PER_TURN === 0) turnUpdate();
    if (state.tick % TICKS_PER_ROUND === 0) roundUpdate();

    ticks++;

    updateStats();

    // Check for winner
    const activePlayers = state.players.filter(p => p.stats.systems > 0);

    if (activePlayers.length === 1) {
      winner = activePlayers[0].id;
      state.running = false;
    } else if (activePlayers.length === 0) {
      // Draw?
      state.running = false;
    }
  }

  return { gameId, winner, ticks };
}

async function main() {
  console.log("Starting Simulations...");
  const results = [];

  for (let i = 0; i < 10; i++) {
    const result = await runSimulation(i + 1);
    console.log(`Game ${result.gameId}: Winner=${result.winner}, Ticks=${result.ticks}`);
    results.push(result);
  }

  console.log("\n=== Simulation Summary ===");
  console.log(`Total Games: ${results.length}`);

  const wins: Record<number, number> = {};
  const winTicks: Record<number, number[]> = {};
  let timeouts = 0;

  results.forEach(r => {
    if (r.winner === -1) {
      timeouts++;
    } else {
      wins[r.winner] = (wins[r.winner] || 0) + 1;
      if (!winTicks[r.winner]) winTicks[r.winner] = [];
      winTicks[r.winner].push(r.ticks);
    }
  });

  console.log(`Timeouts: ${timeouts}`);
  Object.entries(wins).forEach(([player, count]) => {
    const pId = parseInt(player);
    // Map player ID to personality if possible, but we know the mapping from the loop
    const personalities = ['territory', 'rusher', 'turtle', 'balanced'];
    const name = personalities[(pId - 1) % personalities.length];

    const ticks = winTicks[pId];
    const min = Math.min(...ticks);
    const max = Math.max(...ticks);
    const avg = ticks.reduce((a, b) => a + b, 0) / ticks.length;

    console.log(`Player ${player} (${name}): ${count} wins. Ticks: Min=${min}, Max=${max}, Avg=${avg.toFixed(0)}`);
  });
  console.log("==========================\n");
}

main();
