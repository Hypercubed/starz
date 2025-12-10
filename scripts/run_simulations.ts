
import { type BotPersonalities, PERSONALITIES } from '../src/game/bots.ts';
import { Bot } from '../src/game/bots.ts';
import { SimGameManager } from '../src/managers/simulation.ts';
import type {} from '../src/globals.d.ts';
import type { Player } from '../src/types.d.ts';

const N = 10; // Number of simulations
const T = 5000; // Max ticks per simulation

const personalities = Object.keys(PERSONALITIES) as BotPersonalities[];

async function runSimulation(gameId: number) {
  const manager = new SimGameManager();
  globalThis.gameManager = manager;

  manager.connect();

  let ctx = manager.getContext();

  for (let i = 0; i < personalities.length; i++) {
    const id = `${i + 1}`;
    const bot = new Bot({ id, personality: personalities[i] });

    manager.addPlayer(
      `${personalities[i]}`,
      id,
      bot,
      `red`
    );
  }
  
  // Add specific personalities
  const id = `${ctx.S.playerMap.size + 1}`;
  const bot = new Bot({ id, personality: 'idle', name: 'idle' });
  manager.addPlayer(
    `idle`,
    id,
    bot,
    `red`
  );

  let winner: Player | null = null;
  let running = true;

  const players = Array.from(ctx.S.playerMap.values());
  // console.log(players);

  while (ctx.C.tick < T && running) {
    manager.gameTick();

    // Check for winner
    const activePlayers = players.filter(p => p.stats.systems > 0);

    if (activePlayers.length === 1) {
      winner = activePlayers[0];
      running = false;
    } else if (activePlayers.length === 0) {
      // Draw?
      running = false;
    }

    ctx = manager.getContext();
  }

  return { gameId, winner, ticks: ctx.C.tick };
}

async function main() {
  console.log("Starting Simulations...");
  const results = [];

  for (let i = 0; i < N; i++) {
    const result = await runSimulation(i + 1);
    const winner = result.winner ? `${result.winner.id} (${result.winner.name})` : 'None';
    console.log(`Game ${result.gameId}: Winner=${winner}, Ticks=${result.ticks}`);
    results.push(result);
  }

  console.log("\n=== Simulation Summary ===");
  console.log(`Total Games: ${results.length}`);

  const wins: Record<string, number> = {};
  const winTicks: Record<string, number[]> = {};
  let timeouts = 0;

  results.forEach(r => {
    if (!r.winner) {
      timeouts++;
    } else {
      wins[r.winner.id] = (wins[r.winner.id] || 0) + 1;
      if (!winTicks[r.winner.id]) winTicks[r.winner.id] = [];
      winTicks[r.winner.id].push(r.ticks);
    }
  });

  console.log(`Timeouts: ${timeouts}`);
  Object.entries(wins).forEach(([player, count]) => {
    const pId = parseInt(player);
    // Map player ID to personality if possible, but we know the mapping from the loop
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
