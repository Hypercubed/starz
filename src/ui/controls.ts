import * as d3 from 'd3';

import { ENABLE_BOT_CONTROL, ENABLE_CHEATS } from '../constants.ts';
import { debugLog } from '../utils/logging.ts';
import { Orders, type Lane, type Order, type System } from '../types.ts';
import { GAME_STATUS, type FnContext } from '../managers/types.ts';
import {
  clearSelection,
  select,
  selection,
  selectOnly,
  selectPath,
  toggleSelection
} from './selection.ts';
import { revealSystem } from '../game/state.ts';
import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
  scaleZoom
} from './render.ts';
import { showHelp } from './ui.ts';

const ROTATION_STEP = 5;

export function setupKeboardControls() {
  d3.select('body').on('keypress.controls', null);
  d3.select('body').on('keyup.controls', null);
  d3.select('body').on('keyup.cheats', null);

  if (ENABLE_CHEATS) {
    d3.select('body').on('keyup.cheats', (event) => {
      if (!event.altKey) return;
      event.preventDefault();
      // debugLog("keyup:", event);

      const ctx = globalThis.gameManager.getContext();

      switch (event.code) {
        case 'KeyC':
          ctx.G.world.systemMap.forEach((system) => {
            if (system.ownerId === ctx.G.thisPlayerId) {
              system.ships *= 2;
            }
          });
          rerender(ctx);
          return;
        case 'KeyR':
          ctx.G.world.systemMap.forEach((system) =>
            revealSystem(ctx.G, system)
          );
          rerender(ctx);
          return;
        case 'NumpadAdd':
        case 'Equal':
          ctx.G.timeScale = Math.min(16, ctx.G.timeScale * 2);
          debugLog(`Time scale increased to ${ctx.G.timeScale}x`);
          return;
        case 'NumpadSubtract':
        case 'Minus':
          ctx.G.timeScale = Math.max(0.25, ctx.G.timeScale / 2);
          debugLog(`Time scale decreased to ${ctx.G.timeScale}x`);
          return;
      }
    });
  }

  d3.select('body').on('keyup.controls', (event) => {
    // debugLog("keyup:", event);

    const ctx = globalThis.gameManager.getContext();

    switch (event.key) {
      case 'Escape':
        clearSelection();
        rerender(ctx);
        return;
      case '?':
        showHelp();
        return;
      case 'x': {
        if (!event.ctrlKey) return;
        ctx.E.quit();
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    const ctx = globalThis.gameManager.getContext();

    switch (event.code) {
      case 'Space':
        if (!('pauseToggle' in globalThis.gameManager)) return;
        (globalThis.gameManager as any).pauseToggle();
        return;
      case 'Equal':
      case 'NumpadAdd':
        scaleZoom(ctx, 1.2);
        rerender(ctx);
        return;
      case 'Minus':
      case 'NumpadSubtract':
        scaleZoom(ctx, 0.8);
        rerender(ctx);
        return;
      case 'KeyW':
        rotateProjection([0, ROTATION_STEP]);
        rerender(ctx);
        return;
      case 'KeyA':
        rotateProjection([-ROTATION_STEP, 0]);
        rerender(ctx);
        return;
      case 'KeyS':
        rotateProjection([0, -ROTATION_STEP]);
        rerender(ctx);
        return;
      case 'KeyD':
        rotateProjection([ROTATION_STEP, 0]);
        rerender(ctx);
        return;
      case 'KeyQ':
        rotateProjection([0, 0, ROTATION_STEP]);
        rerender(ctx);
        break;
      case 'KeyE':
        rotateProjection([0, 0, -ROTATION_STEP]);
        rerender(ctx);
        break;
      case 'KeyH':
        centerOnHome(ctx);
        rerender(ctx);
        return;
      case 'KeyC':
        if (selection.last) {
          centerOnSystem(ctx, selection.last);
          rerender(ctx);
        }
        return;
      case 'KeyP':
        changeView();
        centerOnHome(ctx);
        rerender(ctx);
        return;
    }
  });
}

export function onClickLane(
  event: PointerEvent,
  { G, C }: FnContext,
  lane: Lane
) {
  if (C.gameState !== GAME_STATUS.PLAYING) return;

  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: {
      // Right click
      let from = G.world.systemMap.get(lane.fromId)!;
      let to = G.world.systemMap.get(lane.toId)!;

      if (
        from.ownerId !== G.thisPlayerId &&
        to.ownerId !== G.thisPlayerId &&
        !ENABLE_BOT_CONTROL
      )
        return; // Can't move if neither side is owned by player

      if (from.ownerId !== G.thisPlayerId) {
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
      if (to.ownerId !== G.thisPlayerId && !ENABLE_BOT_CONTROL) return;

      if (!event.altKey) {
        if (!event.ctrlKey && !event.shiftKey) clearSelection();
        select(from.id);
        if (to.ownerId === G.thisPlayerId) select(to.id);
      }
      break;
    }
  }
}

export function onClickSystem(
  event: PointerEvent,
  ctx: FnContext,
  system: System
) {
  if (ctx.C.gameState !== GAME_STATUS.PLAYING) return;

  if (ENABLE_CHEATS && event.altKey) {
    debugLog(
      '' + system.id,
      system.lastMove?.message ?? 'none',
      system.lastMove?.ships ?? 0
    );
    console.log(system);
  }

  switch (event.button) {
    case 0: // Left click
      if (system.ownerId !== ctx.G.thisPlayerId && !ENABLE_BOT_CONTROL) return;
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
        if (system.ownerId !== ctx.G.thisPlayerId && !ENABLE_BOT_CONTROL)
          return;

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
  const { G, E } = globalThis.gameManager.getContext();
  if (!G.world.hasLane(fromId, toId)) return;

  const order = {
    type: Orders.BALANCED_MOVE,
    message: `Balanced move from ${fromId} to ${toId}`,
    toId,
    fromId,
    playerId: G.thisPlayerId!
  } satisfies Order;

  E.takeOrder(order);
}

export function orderMassMove(fromId: string, toId: string) {
  const { G, E } = globalThis.gameManager.getContext();
  if (!G.world.hasLane(fromId, toId)) return;

  const order = {
    type: Orders.MASS_MOVE,
    toId,
    fromId,
    playerId: G.thisPlayerId!,
    message: `Mass move from ${fromId} to ${toId}`
  } satisfies Order;

  E.takeOrder(order);
}
