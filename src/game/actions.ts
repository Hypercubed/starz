import {
  addMessage,
  removeSystemSelect,
  revealSystem,
  state
} from './state.ts';
import type { System } from '../types.ts';

export function moveShips(from: System, to: System, ships: number) {
  if (ships === 0) return;
  if (ships < 0) {
    if (from.ownerId !== to.ownerId) return;
    const s = from;
    from = to;
    to = s;
    ships = -ships;
  }
  if (from.ships < ships) return;

  if (to.ownerId === from.ownerId) {
    transferShips(from, to, ships);
  } else {
    attackSystem(from, to, ships);
  }
}

function attackSystem(from: System, to: System, attackingShips: number) {
  const player = from.ownerId!;
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

function takeSystem(playerId: string, system: System) {
  system.ownerId = playerId;
  system.moveQueue = [];
  if (playerId === state.thisPlayerId) revealSystem(system);

  if (system.homeworld && system.homeworld !== playerId) {
    const loserId = system.homeworld;
    const loser = state.playerMap.get(loserId)!;
    const winner = state.playerMap.get(playerId)!;

    addMessage(
      `Player ${winner.name} has taken over the homeworld of Player ${loser.name}!`
    );
    system.homeworld = null; // No longer a homeworld
    eliminatePlayer(playerId, loserId);
    removeSystemSelect(system);
  }
}

function eliminatePlayer(winnerId: string, loserId: string) {
  // Take over homeworld, other systems and 50% of ships
  state.world.systems.forEach((s) => {
    if (s.ownerId === loserId) {
      s.ownerId = winnerId;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = null; // No longer a homeworld
      s.moveQueue = [];
      if (winnerId === state.thisPlayerId) revealSystem(s);
    }
  });

  if (loserId === state.thisPlayerId) window.gameManager.playerLose(winnerId);
}

function transferShips(from: System, to: System, ships: number) {
  if (from.ships < ships) return; // Not enough ships to transfer
  from.ships -= ships;
  to.ships += ships;
  if (to.ownerId === state.thisPlayerId) revealSystem(to);
}

export function doQueuedMoves() {
  state.world.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      window.gameManager.makeMove(move);
    }
  });
}
