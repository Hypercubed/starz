import { doQueuedMoves } from './actions';
import { Bot, botQueue } from './bots';
import {
  MAX_SHIPS_PER_SYSTEM,
  NumBots,
  NumHumanPlayers,
  PLAYER,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  START_PAUSED,
  TICK_DURATION_MS,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from './constants';
import { trackEvent } from './logging';
import { rerender } from './render';
import { addMessage, state } from './state';
import { updateInfoBox, updateLeaderbox, updateMessageBox } from './ui';

let gameOver = false;
let runningInterval: number | null = null;

function updateStats() {
  state.players.forEach((player) => {
    const systems = state.systems.filter(
      (system) => system.owner === player.id
    );
    const homeworld = systems.find((system) => system.homeworld === player.id);
    const ships = systems.reduce((sum, system) => sum + (system.ships ?? 0), 0);
    player.stats = {
      player: player.id,
      systems: systems.length,
      ships,
      homeworld: homeworld?.ships ?? 0
    };
  });

  // if (state.tick % 10 === 0) {
  //   console.log(`Tick ${state.tick} Stats:`);
  //   state.players.forEach((p) => {
  //     console.log(
  //       `Player ${p.id}: Systems=${p.stats.systems}, Ships=${p.stats.ships}, Homeworld=${p.stats.homeworld}`,
  //     );
  //   });
  // }
}

function turnUpdate() {
  state.systems.forEach((system) => {
    if (system.type === 'inhabited' && system.owner != null) {
      if (system.owner > 0 || system.ships < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  });
}

function roundUpdate() {
  state.systems.forEach((system) => {
    if (system.owner != null && system.owner > 0) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  });
}

export function startGame() {
  state.running = true;
  gameOver = false;
  trackEvent('starz_gamesStarted');
  addMessage(`Game started. You are Player ${PLAYER}.`);

  // Initialize players
  state.players = [];
  for (let i = 1; i <= NumHumanPlayers + NumBots; i++) {
    const isHuman = i <= NumHumanPlayers;
    state.players.push({
      id: i,
      isHuman,
      bot: isHuman ? undefined : new Bot(i),
      stats: { player: i, systems: 0, ships: 0, homeworld: 0 }
    });
  }

  if (!START_PAUSED) {
    runGameLoop();
  }
}

export function runGameLoop() {
  if (!state.running) {
    stopGame();
    return;
  }

  if (runningInterval) clearTimeout(runningInterval);
  runningInterval = null;

  state.tick++;

  if (state.tick % TICKS_PER_TURN === 0) turnUpdate();
  if (state.tick % TICKS_PER_ROUND === 0) roundUpdate();

  botQueue();

  doQueuedMoves();

  rerender();
  updateInfoBox();
  updateStats();
  updateLeaderbox();
  checkVictory();
  updateMessageBox();

  runningInterval = setTimeout(() => {
    runGameLoop();
  }, TICK_DURATION_MS / state.timeScale);
}

export function stopGame() {
  state.running = false;
  if (runningInterval) {
    clearTimeout(runningInterval);
    runningInterval = null;
  }
}

function checkVictory() {
  if ((NumBots as number) === 0) return;
  if (!state.running) return;

  // TODO: Use stats from state
  const homeworlds = state.systems.filter(
    (system) => system.homeworld && system.owner === system.homeworld
  );

  if (!gameOver && homeworlds.length === 1) {
    const winner = homeworlds[0].owner;
    addMessage(`Player ${winner} has conquered The Bubble!`);
    rerender();
    stopGame();
    if (winner === PLAYER) {
      trackEvent('starz_gamesWon');
    }
    gameOver = true;
  }
}

export function pauseToggle() {
  if (state.running) {
    stopGame();
  } else {
    state.running = true;
    runGameLoop();
  }
}
