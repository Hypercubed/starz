import { botsMove } from "./bots";
import { MAX_SHIPS_PER_SYSTEM, NumBots, SHIPS_PER_ROUND, SHIPS_PER_TURN, TICK_DURATION_MS, TICKS_PER_ROUND, TICKS_PER_TURN } from "./constants";
import { rerender } from "./render";
import { addMessage, state } from "./state";
import { updateInfoBox, updateLeaderbox, updateMessageBox } from "./ui";

let gameRunning = false;
let runningInterval: number | null = null;

function updateStats() {
  const playerStats: { player: number; systems: number; ships: number, homeworld: number }[] = [];
  for (let i = 1; i <= NumBots + 1; i++) {
    const systems = state.systems.filter(system => system.owner === i);
    const homeworld = systems.find(system => system.homeworld === i);
    const ships = systems.reduce((sum, system) => sum + (system.ships ?? 0), 0);
    playerStats.push({ player: i, systems: systems.length, ships, homeworld: (homeworld?.ships ?? 0) });
  }
  state.playerStats = playerStats;
}

function turnUpdate() {
  state.systems.forEach(system => {
    if (system.isInhabited && system.owner != null && system.owner > 0) {
      if (system.owner > 0 || system.ships  < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  });
}

function roundUpdate() {
  state.systems.forEach(system => {
    if (system.owner != null && system.owner > 0) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  });
}

export function startGame() {
  gameRunning = true;
  runGameLoop();
}

export function runGameLoop() {
  if (!gameRunning) {
    stopGame();
    return;
  }

  if (runningInterval) clearTimeout(runningInterval);
  runningInterval = null;

  state.tick++;

  if (state.tick % TICKS_PER_TURN === 0) turnUpdate();
  if (state.tick % TICKS_PER_ROUND === 0) roundUpdate();

  botsMove();
  
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
  gameRunning = false;
  if (runningInterval) {
    clearTimeout(runningInterval);
    runningInterval = null;
  }
}

function checkVictory() {
  if ((NumBots as number) === 0) return;
  if (!gameRunning) return;

  // TODO: Use stats from state
  const homeworlds = state.systems.filter(system => system.homeworld && system.owner === system.homeworld);

  if (homeworlds.length === 1) {
    const winner = homeworlds[0].owner;
    addMessage(`Player ${winner} has won the game!`);
    stopGame();
  }
}

export function pauseToggle() {
  if (gameRunning) {
    stopGame();
  } else {
    gameRunning = true;
    runGameLoop();
  }
}