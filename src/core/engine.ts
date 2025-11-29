import {
  MAX_SHIPS_PER_SYSTEM,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from './constants.ts';

import { addMessage, resetState, state } from '../game/state.ts';
import { generateMap } from '../game/generate.ts';
import { drawMap, rerender } from '../render/render.ts';
import { doQueuedMoves, playerLose, playerWin } from '../game/actions.ts';
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
      (system) => system.ownerId === player.id
    );
    const homeworld = systems.find((system) => system.homeworld === player.id);
    const ships = systems.reduce((sum, system) => sum + (system.ships ?? 0), 0);
    player.stats = {
      playerId: player.id,
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
    if (system.type === 'inhabited' && system.ownerId != null) {
      if (system.ownerId || system.ships < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  });
}

export function roundUpdate() {
  state.world.systems.forEach((system) => {
    if (system.ownerId != null) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  });
}

export function checkVictory() {
  if (state.players.length === 1) return;
  if (window.gameManager.gameState !== GAME_STATE.PLAYING) return;

  // TODO: Use stats from state
  const homeworlds = state.world.systems.filter(
    (system) => system.homeworld && system.ownerId === system.homeworld
  );

  if (homeworlds.length === 1) {
    const winnerId = homeworlds[0].ownerId!;
    const winner = state.playerMap.get(winnerId)!;

    addMessage(`Player ${winner.name} has conquered The Bubble!`);
    rerender();

    window.gameManager.stopGame();

    if (winnerId === state.thisPlayer) {
      playerWin();
    } else {
      playerLose(winnerId);
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
