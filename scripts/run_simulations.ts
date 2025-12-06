
import { type BotPersonalities, PERSONALITIES } from '../src/game/bots.ts';
import { Bot } from '../src/game/bots.ts';
import { SimGameManager } from '../src/managers/simulation.ts';
import type {} from '../src/globals.d.ts';
import { eventBus } from '../src/events/index.ts';

const N = 1000; // Number of simulations
const T = 5000; // Max ticks per simulation

async function runSimulation(gameId: number) {
  eventBus.clear();

  const manager = new SimGameManager();
  globalThis.gameManager = manager;

  manager.connect();

  let ctx = manager.getContext();

  const personalities = Object.keys(PERSONALITIES) as BotPersonalities[];
  for (let i = 1; i <= personalities.length; i++) {
    const id = `${i}`;
    const bot = new Bot({ id, personality: personalities[i - 1] });

    manager.addPlayer(
      `${personalities[i - 1]}`,
      id,
      bot,
      `red`
    );
  }
  
  // Add specific personalities
  // const id = `${ctx.G.players.length + 1}`;
  // const bot = new Bot({ id, personality: 'idle' });
  // manager.addPlayer(
  //   `idle`,
  //   id,
  //   bot,
  //   `red`
  // );

  let winner = '-1';
  let running = true;

  while (ctx.G.tick < T && running) {
    manager.gameTick();

    // Check for winner
    const activePlayers = ctx.G.players.filter(p => p.stats.systems > 0);

    if (activePlayers.length === 1) {
      winner = activePlayers[0].id;
      running = false;
    } else if (activePlayers.length === 0) {
      // Draw?
      running = false;
    }

    ctx = manager.getContext();
  }

  return { gameId, winner, ticks: ctx.G.tick };
}

async function main() {
  console.log("Starting Simulations...");
  const results = [];

  for (let i = 0; i < N; i++) {
    const result = await runSimulation(i + 1);
    console.log(`Game ${result.gameId}: Winner=${result.winner}, Ticks=${result.ticks}`);
    results.push(result);
  }

  console.log("\n=== Simulation Summary ===");
  console.log(`Total Games: ${results.length}`);

  const wins: Record<string, number> = {};
  const winTicks: Record<string, number[]> = {};
  let timeouts = 0;

  results.forEach(r => {
    if (r.winner === '-1') {
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
