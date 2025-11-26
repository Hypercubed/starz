import { PLAYER } from '../core/constants.ts';
import { removeSystemSelect } from '../input/controls.ts';

import { trackEvent } from '../utils/logging.ts';
import { rerender } from '../render/render.ts';
import { addMessage, state } from './state.ts';
import type { System } from '../types.ts';
import { showEndGame } from '../render/ui.ts';

export function orderBalancedMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips =
    to.owner === from.owner
      ? Math.floor((from.ships - to.ships) / 2)
      : Math.floor(from.ships / 2);

  moveShips(from, to, deltaShips);
}

export function orderMassMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips = from.ships - 1;
  moveShips(from, to, deltaShips);
}

function moveShips(from: System, to: System, ships: number) {
  if (ships === 0) return;
  if (ships < 0) {
    if (from.owner !== to.owner) return;
    const s = from;
    from = to;
    to = s;
    ships = -ships;
  }
  if (from.ships < ships) return;

  if (to.owner === from.owner) {
    transferShips(from, to, ships);
  } else {
    attackSystem(from, to, ships);
  }
}

function attackSystem(from: System, to: System, attackingShips: number) {
  const player = from.owner!;
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
  system.owner = player;
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
    if (s.owner === loser) {
      s.owner = winner;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = null; // No longer a homeworld
      s.moveQueue = [];
      if (winner === PLAYER) revealSystem(s);
    }
  });

  if (loser === PLAYER) playerLose(winner);
}

export function playerWin() {
  state.running = false;

  state.world.systems.forEach(revealSystem);
  state.lastSelectedSystem = null;
  state.selectedSystems = [];
  rerender();

  trackEvent('starz_gamesWon');
  showEndGame(`You have conquered The Bubble!`);
}

export function playerLose(winner: number) {
  state.running = false;

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
  if (to.owner === PLAYER) revealSystem(to);
}

export function queueMove(
  from: System,
  to: System,
  ships: number,
  message?: string
) {
  from.moveQueue.push({ ships, toIndex: to.id, message });
}

export function doQueuedMoves() {
  state.world.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      moveShips(system, state.world.systems[move.toIndex], move.ships);
      system.lastMove = move;
    }
  });
}
