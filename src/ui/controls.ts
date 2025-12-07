import * as d3 from 'd3';

import { ENABLE_BOT_CONTROL, ENABLE_CHEATS } from '../constants.ts';
import { revealSystem } from '../game/state.ts';
import { hasLane } from '../game/world.ts';
import { debugLog } from '../utils/logging.ts';

import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
  scaleZoom
} from './render.ts';
import {
  clearSelection,
  select,
  selection,
  selectOnly,
  selectPath,
  toggleSelection
} from './selection.ts';
import { showHelp } from './ui.ts';

import type { Lane, Order, System } from '../game/types';

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

      const { G, C } = globalThis.gameManager.getContext();

      switch (event.code) {
        case 'KeyC':
          G.world.systemMap.forEach((system) => {
            if (system.ownerId === G.thisPlayerId) {
              system.ships *= 2;
            }
          });
          rerender();
          return;
        case 'KeyR':
          G.world.systemMap.forEach((system) => revealSystem(G, system));
          rerender();
          return;
        case 'NumpadAdd':
        case 'Equal':
          C.gameConfig.timeScale = Math.min(16, C.gameConfig.timeScale * 2);
          debugLog(`Time scale increased to ${C.gameConfig.timeScale}x`);
          return;
        case 'NumpadSubtract':
        case 'Minus':
          C.gameConfig.timeScale = Math.max(0.25, C.gameConfig.timeScale / 2);
          debugLog(`Time scale decreased to ${C.gameConfig.timeScale}x`);
          return;
      }
    });
  }

  d3.select('body').on('keyup.controls', (event) => {
    // debugLog("keyup:", event);

    switch (event.key) {
      case 'Escape':
        clearSelection();
        rerender();
        return;
      case '?':
        showHelp();
        return;
      case 'x': {
        if (!event.ctrlKey) return;
        globalThis.gameManager.events.emit('UI_QUIT', undefined);
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    switch (event.code) {
      case 'Space':
        globalThis.gameManager.events.emit('UI_PAUSE_TOGGLE', undefined);
        return;
      case 'Equal':
      case 'NumpadAdd':
        scaleZoom(1.2);
        rerender();
        return;
      case 'Minus':
      case 'NumpadSubtract':
        scaleZoom(0.8);
        rerender();
        return;
      case 'KeyW':
        rotateProjection([0, ROTATION_STEP]);
        rerender();
        return;
      case 'KeyA':
        rotateProjection([-ROTATION_STEP, 0]);
        rerender();
        return;
      case 'KeyS':
        rotateProjection([0, -ROTATION_STEP]);
        rerender();
        return;
      case 'KeyD':
        rotateProjection([ROTATION_STEP, 0]);
        rerender();
        return;
      case 'KeyQ':
        rotateProjection([0, 0, ROTATION_STEP]);
        rerender();
        break;
      case 'KeyE':
        rotateProjection([0, 0, -ROTATION_STEP]);
        rerender();
        break;
      case 'KeyH':
        centerOnHome();
        rerender();
        return;
      case 'KeyC':
        if (selection.last) {
          centerOnSystem(selection.last);
          rerender();
        }
        return;
      case 'KeyP':
        changeView();
        centerOnHome();
        rerender();
        return;
    }
  });
}

export function onClickLane(event: PointerEvent, lane: Lane) {
  const { G, C } = globalThis.gameManager.getContext();
  if (C.gameStatus !== 'PLAYING') return;

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

export function onClickSystem(event: PointerEvent, system: System) {
  const ctx = globalThis.gameManager.getContext();
  if (ctx.C.gameStatus !== 'PLAYING') return;

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
  const { G } = globalThis.gameManager.getContext();
  if (!hasLane(G.world, fromId, toId)) return;

  const order = {
    type: 'BALANCED_MOVE',
    message: `Balanced move from ${fromId} to ${toId}`,
    toId,
    fromId,
    playerId: G.thisPlayerId!
  } satisfies Order;

  globalThis.gameManager.events.emit('TAKE_ORDER', order);
}

export function orderMassMove(fromId: string, toId: string) {
  const { G } = globalThis.gameManager.getContext();
  if (!hasLane(G.world, fromId, toId)) return;

  const order = {
    type: 'MASS_MOVE',
    toId,
    fromId,
    playerId: G.thisPlayerId!,
    message: `Mass move from ${fromId} to ${toId}`
  } satisfies Order;

  globalThis.gameManager.events.emit('TAKE_ORDER', order);
}
