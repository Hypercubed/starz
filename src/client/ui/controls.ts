import { ENABLE_BOT_CONTROL, ENABLE_CHEATS } from '../constants.ts';
import * as game from '../game/index.ts';

import {
  clearSelection,
  select,
  selection,
  selectOnly,
  selectPath,
  toggleSelection
} from './selection.ts';

import type { Lane, Order, System } from '../game/types';

export function onClickLane(event: PointerEvent, lane: Lane) {
  const { S, C } = globalThis.gameManager.getFnContext();
  if (C.status !== 'PLAYING') return;

  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: {
      // Right click
      let from = S.world.systemMap.get(lane.fromId)!;
      let to = S.world.systemMap.get(lane.toId)!;

      if (
        from.ownerId !== C.playerId &&
        to.ownerId !== C.playerId &&
        !ENABLE_BOT_CONTROL
      )
        return; // Can't move if neither side is owned by player

      if (from.ownerId !== C.playerId) {
        // Make sure 'from' is owned by player
        const s = from;
        from = to;
        to = s;
      } else if (from.ownerId === from.ownerId) {
        if (to.ships > from.ships) {
          // swap
          const s = from;
          from = to;
          to = s;
        }
      }

      orderBalancedMove(from.id, to.id);
      if (to.ownerId !== C.playerId && !ENABLE_BOT_CONTROL) return;

      if (!event.altKey) {
        if (!event.ctrlKey && !event.shiftKey) clearSelection();
        select(from.id);
        if (to.ownerId === C.playerId) select(to.id);
      }
      break;
    }
  }
}

export function onClickSystem(event: PointerEvent, system: System) {
  const ctx = globalThis.gameManager.getFnContext();
  if (ctx.C.status !== 'PLAYING') return;

  if (ENABLE_CHEATS && event.altKey) {
    globalThis.gameManager.getFnContext().E.emit('LOG', {
      message: '' + system.id,
      params: [
        system.lastMove?.message ?? 'none',
        system.lastMove?.ships ?? 0,
        system
      ]
    });
  }

  switch (event.button) {
    case 0: // Left click
      if (system.ownerId !== ctx.C.playerId && !ENABLE_BOT_CONTROL) return;
      if (event.ctrlKey || event.metaKey) {
        toggleSelection(system.id);
      } else if (event.shiftKey) {
        selectPath(ctx, system.id);
      } else {
        selectOnly(system.id);
      }
      break;
    case -1: // Long press (touch)
    case 2: {
      // Right click
      const selectedSystems = Array.from(selection.all);
      if (selectedSystems.length === 0) return;

      selectedSystems.forEach((fromId) => {
        orderMassMove(fromId, system.id);
        if (system.ownerId !== ctx.C.playerId && !ENABLE_BOT_CONTROL) return;

        if (!event.altKey) {
          if (!event.ctrlKey && !event.shiftKey) {
            clearSelection();
          }
          select(system.id);
        }
      });
      break;
    }
  }
}

export function orderBalancedMove(fromId: string, toId: string) {
  const { S, E, C } = globalThis.gameManager.getFnContext();
  if (!game.hasLane(S.world, fromId, toId)) return;

  const order = {
    type: 'BALANCED_MOVE',
    message: `Balanced move from ${fromId} to ${toId}`,
    toId,
    fromId,
    playerId: C.playerId!
  } satisfies Order;

  E.emit('TAKE_ORDER', order);
}

export function orderMassMove(fromId: string, toId: string) {
  const { S, E, C } = globalThis.gameManager.getFnContext();
  if (!game.hasLane(S.world, fromId, toId)) return;

  const order = {
    type: 'MASS_MOVE',
    toId,
    fromId,
    playerId: C.playerId!,
    message: `Mass move from ${fromId} to ${toId}`
  } satisfies Order;

  E.emit('TAKE_ORDER', order);
}
