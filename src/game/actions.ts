import { revealSystem, state } from './state.ts';
import { Orders, type Move, type Order, type System } from '../types.ts';

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
    window.gameManager.eliminatePlayer(system.homeworld, playerId);
  }
}

export function eliminatePlayer(
  loserId: string,
  winnerId: string | null = null
) {
  // Take over homeworld, other systems and 50% of ships
  state.world.systems.forEach((s) => {
    if (s.ownerId === loserId) {
      s.ownerId = winnerId;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = null; // No longer a homeworld
      s.moveQueue = [];
      if (winnerId === state.thisPlayerId) revealSystem(s);
    }

    if (s.homeworld === loserId) {
      s.homeworld = null; // No longer a homeworld
    }
  });

  const loser = state.playerMap.get(loserId);
  if (loser) {
    loser.isAlive = false;
  }

  if (loserId === state.thisPlayerId) {
    window.gameManager.playerLose(winnerId);
  }
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

function validateOrder(order: Order): boolean {
  const fromSystem = state.world.systemMap.get(order.fromId)!;

  if (fromSystem.ownerId !== order.playerId) return false;
  if (!state.world.hasLane(order.fromId, order.toId)) return false;
  if (fromSystem.ships <= 1) return false;
  return true;
}

export function orderToMove(order: Order): Move | null {
  if (!validateOrder(order)) return null;

  switch (order.type) {
    case Orders.MASS_MOVE:
      return massMoveShips(order.fromId, order.toId);
      break;
    case Orders.BALANCED_MOVE:
      return balancedMoveShips(order.fromId, order.toId);
      break;
  }

  return null;

  function massMoveShips(fromId: string, toId: string): Move {
    const fromSystem = state.world.systemMap.get(fromId)!;
    const deltaShips = fromSystem.ships - 1;

    return {
      message: `Move ${deltaShips} ships from ${fromId} to ${toId}`,
      ships: deltaShips,
      toId: toId,
      fromId: fromId,
      playerId: state.thisPlayerId!
    } satisfies Move;
  }

  function balancedMoveShips(fromId: string, toId: string): Move | null {
    let fromSystem = state.world.systemMap.get(fromId)!;
    let toSystem = state.world.systemMap.get(toId)!;

    const deltaShips =
      toSystem.ownerId === fromSystem.ownerId
        ? Math.floor((fromSystem.ships - toSystem.ships) / 2)
        : Math.floor(fromSystem.ships / 2);

    if (deltaShips <= 0) {
      if (deltaShips < 0 && toSystem.ownerId === fromSystem.ownerId) {
        // swap
        const temp = fromSystem;
        fromSystem = toSystem;
        toSystem = temp;
      } else {
        return null;
      }
    }

    return {
      message: `Move ${deltaShips} ships from ${fromId} to ${toId}`,
      ships: deltaShips,
      toId: toId,
      fromId: fromId,
      playerId: state.thisPlayerId!
    } satisfies Move;
  }
}
