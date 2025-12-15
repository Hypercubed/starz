import * as d3 from 'd3';

import { ENABLE_BOT_CONTROL, ENABLE_CHEATS } from '../constants.ts';
import * as game from '../game/index.ts';
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
import { showEndGame, showHelp } from './ui.ts';

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

      const { S, C } = globalThis.gameManager.getContext();

      switch (event.code) {
        case 'KeyC':
          for (const system of S.world.systemMap.values()) {
            if (system.ownerId === C.playerId) {
              system.ships *= 2;
            }
          }
          rerender();
          return;
        case 'KeyR':
          game.revealAllSystems(S);
          rerender();
          return;
        case 'NumpadAdd':
        case 'Equal': {
          const timeScale = Math.min(16, C.config.timeScale * 2);
          globalThis.gameManager.setConfig({ timeScale });
          debugLog(`Time scale increased to ${C.config.timeScale}x`);
          return;
        }
        case 'NumpadSubtract':
        case 'Minus': {
          const timeScale = Math.max(0.25, C.config.timeScale / 2);
          globalThis.gameManager.setConfig({ timeScale });
          debugLog(`Time scale decreased to ${C.config.timeScale}x`);
          return;
        }
      }
    });
  }

  d3.select('body').on('keyup.controls', async (event) => {
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
        const ret = await showEndGame('Are you sure you want to quit?');
        if (ret) {
          const { C, E } = globalThis.gameManager.getContext();
          E.emit('PLAYER_QUIT', { playerId: C.playerId });
        }
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    switch (event.code) {
      case 'Space':
        if ('pauseToggle' in globalThis.gameManager) {
          (globalThis.gameManager.pauseToggle as () => void)();
        }
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
  const { S, C } = globalThis.gameManager.getContext();
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
  const ctx = globalThis.gameManager.getContext();
  if (ctx.C.status !== 'PLAYING') return;

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
  const { S, E, C } = globalThis.gameManager.getContext();
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
  const { S, E, C } = globalThis.gameManager.getContext();
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
