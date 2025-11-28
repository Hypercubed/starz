import { PLAYER } from '../core/constants.ts';
import { removeSystemSelect } from '../input/controls.ts';

import { trackEvent } from '../utils/logging.ts';
import { rerender } from '../render/render.ts';
import { addMessage, state } from './state.ts';
import type { System } from '../types.ts';
import { showEndGame } from '../render/ui.ts';
import { GAME_STATE } from '../services/game-manager.ts';

export function moveShips(from: System, to: System, ships: number) {
  if (ships === 0) return;
  if (ships < 0) {
    if (from.ownerIndex !== to.ownerIndex) return;
    const s = from;
    from = to;
    to = s;
    ships = -ships;
  }
  if (from.ships < ships) return;

  if (to.ownerIndex === from.ownerIndex) {
    transferShips(from, to, ships);
  } else {
    attackSystem(from, to, ships);
  }
}

function attackSystem(from: System, to: System, attackingShips: number) {
  const player = from.ownerIndex!;
  const defendingShips = to.ships ?? 0;

  if (attackingShips > defendingShips) {
    const remainingShips = attackingShips - defendingShips;
    from.ships = from.ships - attackingShips;
    to.ships = remainingShips;
    takeSystem(player, to);
  } else {
    from.ships = from.ships - attackingShips;
    to.ships = defendingShips - attackingShips;
  }
}

function takeSystem(player: number, system: System) {
  system.ownerIndex = player;
  system.moveQueue = [];
  if (player === PLAYER) revealSystem(system);

  if (system.homeworld && system.homeworld !== player) {
    const loser = system.homeworld;
    addMessage(
      `Player ${player} has taken over the homeworld of Player ${loser}!`
    );
    system.homeworld = null; // No longer a homeworld
    eliminatePlayer(player, loser);
    removeSystemSelect(system);
  }
}

function eliminatePlayer(winner: number, loser: number) {
  // Take over homeworld, other systems and 50% of ships
  state.world.systems.forEach((s) => {
    if (s.ownerIndex === loser) {
      s.ownerIndex = winner;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = null; // No longer a homeworld
      s.moveQueue = [];
      if (winner === PLAYER) revealSystem(s);
    }
  });

  if (loser === PLAYER) playerLose(winner);
}

export function playerWin() {
  window.gameManager.stopGame();
  window.gameManager.gameState = GAME_STATE.FINISHED;

  state.world.systems.forEach(revealSystem);
  state.lastSelectedSystem = null;
  state.selectedSystems = [];
  rerender();

  trackEvent('starz_gamesWon');
  showEndGame(`You have conquered The Bubble!`);
}

export function playerLose(winner: number) {
  window.gameManager.stopGame();
  window.gameManager.gameState = GAME_STATE.FINISHED;

  state.world.systems.forEach(revealSystem);
  state.lastSelectedSystem = null;
  state.selectedSystems = [];
  rerender();

  trackEvent('starz_gamesLost', { winner });
  showEndGame(`You have lost your homeworld! Game Over.`);
}

export function revealSystem(system: System) {
  system.isRevealed = true;
  system.isVisited = true;
  const neighbors = state.world.getAdjacentSystems(system);

  if (!neighbors) return;

  neighbors.forEach((neighbor) => {
    neighbor.isRevealed = true;
    neighbor.isVisited = true;
  });
}

function transferShips(from: System, to: System, ships: number) {
  if (from.ships < ships) return; // Not enough ships to transfer
  from.ships -= ships;
  to.ships += ships;
  if (to.ownerIndex === PLAYER) revealSystem(to);
}

export function queueMove(
  from: System,
  to: System,
  ships: number,
  playerIndex: number,
  message?: string
) {
  from.moveQueue.push({ ships, toIndex: to.index, fromIndex: from.index, playerIndex, message });
}

export function doQueuedMoves() {
  state.world.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      const to = state.world.systems[move.toIndex];
      moveShips(system, to, move.ships);
      system.lastMove = move;
    }
  });
}
