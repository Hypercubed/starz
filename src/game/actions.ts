import { revealSystem } from './state.ts';
import { hasLane } from './world.ts';

import type { Move, Order, System, GameState } from './types.d.ts';
import type { FnContext } from '../managers/types';

export function moveShips(
  ctx: FnContext,
  from: System,
  to: System,
  ships: number
) {
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
    transferShips(ctx, from, to, ships);
  } else {
    attackSystem(ctx, from, to, ships);
  }
}

function attackSystem(
  ctx: FnContext,
  from: System,
  to: System,
  attackingShips: number
) {
  const player = from.ownerId!;
  const defendingShips = to.ships ?? 0;

  if (attackingShips > defendingShips) {
    const remainingShips = attackingShips - defendingShips;
    from.ships = from.ships - attackingShips;
    to.ships = remainingShips;
    takeSystem(ctx, player, to);
  } else {
    from.ships = from.ships - attackingShips;
    to.ships = defendingShips - attackingShips;
  }
}

function takeSystem({ S, E, C }: FnContext, playerId: string, system: System) {
  system.ownerId = playerId;
  system.moveQueue = [];
  if (playerId === C.playerId) revealSystem(S, system);

  if (system.homeworld && system.homeworld !== playerId) {
    E.emit('PLAYER_ELIMINATED', {
      playerId: system.homeworld,
      winnerId: playerId
    });
  }
}

export function eliminatePlayer(
  { S, E, C }: FnContext,
  loserId: string,
  winnerId: string | null = null
) {
  // Take over homeworld, other systems and 50% of ships
  S.world.systems.forEach((s) => {
    if (s.ownerId === loserId) {
      s.ownerId = winnerId;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = null; // No longer a homeworld
      s.moveQueue = [];
      if (winnerId === C.playerId) revealSystem(S, s);
    }

    if (s.homeworld === loserId) {
      s.homeworld = null; // No longer a homeworld
    }
  });

  const loser = S.playerMap.get(loserId);
  if (loser) {
    loser.isAlive = false;
  }

  if (loserId === C.playerId) {
    E.emit('PLAYER_LOSE', {
      playerId: C.playerId,
      winnerId: winnerId
    });
  }
}

function transferShips(
  { S, C }: FnContext,
  from: System,
  to: System,
  ships: number
) {
  if (from.ships < ships) return; // Not enough ships to transfer
  from.ships -= ships;
  to.ships += ships;
  if (to.ownerId === C.playerId) revealSystem(S, to);
}

export function doQueuedMoves({ S, E }: FnContext) {
  S.world.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      E.emit('MAKE_MOVE', move);
    }
  });
}

function validateOrder(state: GameState, order: Order): boolean {
  const fromSystem = state.world.systemMap.get(order.fromId)!;

  if (fromSystem.ownerId !== order.playerId) return false;
  if (!hasLane(state.world, order.fromId, order.toId)) return false;
  if (fromSystem.ships <= 1) return false;
  return true;
}

export function orderToMove(state: GameState, order: Order): Move | null {
  if (!validateOrder(state, order)) return null;

  switch (order.type) {
    case 'MASS_MOVE':
      return massMoveShips(order.fromId, order.toId);
      break;
    case 'BALANCED_MOVE':
      return balancedMoveShips(order.fromId, order.toId);
      break;
  }

  return null;

  function massMoveShips(fromId: string, toId: string): Move | null {
    const { C } = globalThis.gameManager!.getContext();

    const fromSystem = state.world.systemMap.get(fromId)!;
    const deltaShips = fromSystem.ships - 1;

    if (deltaShips <= 0) return null;

    return {
      message: `Move ${deltaShips} ships from ${fromId} to ${toId}`,
      ships: deltaShips,
      toId: toId,
      fromId: fromId,
      playerId: C.playerId
    } satisfies Move;
  }

  function balancedMoveShips(fromId: string, toId: string): Move | null {
    const { C } = globalThis.gameManager!.getContext();

    const fromSystem = state.world.systemMap.get(fromId)!;
    const toSystem = state.world.systemMap.get(toId)!;

    const deltaShips =
      toSystem.ownerId === fromSystem.ownerId
        ? Math.floor((fromSystem.ships - toSystem.ships) / 2)
        : Math.floor(fromSystem.ships / 2);

    if (deltaShips <= 0) return null;

    return {
      message: `Move ${deltaShips} ships from ${fromSystem.id} to ${toSystem.id}`,
      ships: deltaShips,
      toId: toSystem.id,
      fromId: fromSystem.id,
      playerId: C.playerId
    } satisfies Move;
  }
}
