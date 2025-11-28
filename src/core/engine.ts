import {
  MAX_SHIPS_PER_SYSTEM,
  NumBots,
  PLAYER,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from './constants.ts';

import { addMessage, resetState, state } from '../game/state.ts';
import { generateMap } from '../game/generate.ts';
import { drawMap, rerender } from '../render/render.ts';
import {
  doQueuedMoves,
  playerLose,
  playerWin,
} from '../game/actions.ts';
import {
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox
} from '../render/ui.ts';
import { botQueue } from '../game/bots.ts';
import { GAME_STATE } from '../services/game-manager.ts';

export function setupGame() {
  resetState();

  generateMap();

  drawMap();

  // assignSystem(PLAYER);
  // revealSystem(state.world.systems[0]);
  // centerOnHome();
  rerender();

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();
}

export function updateStats() {
  state.players.forEach((player) => {
    const systems = state.world.systems.filter(
      (system) => system.ownerIndex === player.index
    );
    const homeworld = systems.find((system) => system.homeworld === player.index);
    const ships = systems.reduce((sum, system) => sum + (system.ships ?? 0), 0);
    player.stats = {
      playerIndex: player.index,
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

export function turnUpdate() {
  state.world.systems.forEach((system) => {
    if (system.type === 'inhabited' && system.ownerIndex != null) {
      if (system.ownerIndex > 0 || system.ships < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  });
}

export function roundUpdate() {
  state.world.systems.forEach((system) => {
    if (system.ownerIndex != null && system.ownerIndex > 0) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  });
}

export function checkVictory() {
  if ((NumBots as number) === 0) return;
  if (window.gameManager.gameState !== GAME_STATE.PLAYING) return;

  // TODO: Use stats from state
  const homeworlds = state.world.systems.filter(
    (system) => system.homeworld && system.ownerIndex === system.homeworld
  );

  if (homeworlds.length === 1) {
    const winner = homeworlds[0].ownerIndex!;
    addMessage(`Player ${winner} has conquered The Bubble!`);
    rerender();

    window.gameManager.stopGame();

    if (winner === PLAYER) {
      playerWin();
    } else {
      playerLose(winner);
    }
  }
}

export function pauseToggle() {
  if (!('pauseToggle' in window.gameManager)) return;
  (window.gameManager as any).pauseToggle();
}

export function gameTick() {
  state.tick++;

  if (state.tick % TICKS_PER_TURN === 0) turnUpdate();
  if (state.tick % TICKS_PER_ROUND === 0) roundUpdate();

  botQueue();
  doQueuedMoves();
  updateStats();

  rerender();
  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();
}
