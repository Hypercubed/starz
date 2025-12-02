import * as d3 from 'd3';

import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
  scaleZoom
} from '../render/render.ts';
import {
  addSystemSelect,
  clearSelection,
  state,
  toggleSingleSystemSelect,
  toggleSystemSelect
} from '../game/state.ts';
import { revealSystem } from '../game/state.ts';
import { ENABLE_BOT_CONTROL, ENABLE_CHEATS } from '../core/constants.ts';
import { showHelp } from '../render/ui.ts';
import { debugLog } from '../utils/logging.ts';
import { Orders, type Lane, type Order, type System } from '../types.ts';
import { GAME_STATE } from '../managers/types.ts';

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

      switch (event.code) {
        case 'KeyC':
          state.world.systems.forEach((system) => {
            if (system.ownerId === state.thisPlayerId) {
              system.ships *= 2;
            }
          });
          rerender();
          return;
        case 'KeyR':
          state.world.systems.forEach(revealSystem);
          rerender();
          return;
        case 'NumpadAdd':
        case 'Equal':
          state.timeScale = Math.min(16, state.timeScale * 2);
          debugLog(`Time scale increased to ${state.timeScale}x`);
          return;
        case 'NumpadSubtract':
        case 'Minus':
          state.timeScale = Math.max(0.25, state.timeScale / 2);
          debugLog(`Time scale decreased to ${state.timeScale}x`);
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
        globalThis.gameManager.quit();
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    switch (event.code) {
      case 'Space':
        if (!('pauseToggle' in globalThis.gameManager)) return;
        (globalThis.gameManager as any).pauseToggle();
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
        if (state.lastSelectedSystem) {
          centerOnSystem(state.lastSelectedSystem);
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

function selectPath(systemId: string) {
  if (state.lastSelectedSystem == null) return;

  // Simple BFS to find shortest path
  const queue: string[][] = [[state.lastSelectedSystem]];
  const visited = new Set<string>();
  visited.add(state.lastSelectedSystem);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === systemId) {
      // Found path
      state.selectedSystems = new Set([...state.selectedSystems, ...path]);
      state.lastSelectedSystem = systemId;
      return;
    }
    for (const neighbor of state.world.getAdjacentSystems(current)) {
      if (
        !visited.has(neighbor.id) &&
        neighbor.ownerId === state.thisPlayerId
      ) {
        visited.add(neighbor.id);
        queue.push([...path, neighbor.id]);
      }
    }
  }
}

export function onClickLane(event: PointerEvent, lane: Lane) {
  if (globalThis.gameManager.gameState !== GAME_STATE.PLAYING) return;

  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: {
      // Right click
      let from = state.world.systemMap.get(lane.fromId)!;
      let to = state.world.systemMap.get(lane.toId)!;

      if (
        from.ownerId !== state.thisPlayerId &&
        to.ownerId !== state.thisPlayerId &&
        !ENABLE_BOT_CONTROL
      )
        return; // Can't move if neither side is owned by player

      if (from.ownerId !== state.thisPlayerId) {
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
      if (to.ownerId !== state.thisPlayerId && !ENABLE_BOT_CONTROL) return;

      if (!event.altKey) {
        if (!event.ctrlKey && !event.shiftKey) clearSelection();
        addSystemSelect(from.id);
        if (to.ownerId === state.thisPlayerId) addSystemSelect(to.id);
      }
      break;
    }
  }
}

export function onClickSystem(event: PointerEvent, system: System) {
  if (globalThis.gameManager.gameState !== GAME_STATE.PLAYING) return;

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
      if (system.ownerId !== state.thisPlayerId && !ENABLE_BOT_CONTROL) return;

      if (event.ctrlKey || event.metaKey) {
        toggleSystemSelect(system.id);
      } else if (event.shiftKey) {
        selectPath(system.id);
      } else {
        toggleSingleSystemSelect(system.id);
      }
      break;
    case -1: // Long press (touch)
    case 2: {
      // Right click
      const selectedSystems = Array.from(state.selectedSystems);
      if (selectedSystems.length === 0) return;

      selectedSystems.forEach((fromId) => {
        orderMassMove(fromId, system.id);
        if (system.ownerId !== state.thisPlayerId && !ENABLE_BOT_CONTROL)
          return;

        if (!event.altKey) {
          if (!event.ctrlKey && !event.shiftKey) {
            clearSelection();
          }
          addSystemSelect(system.id);
        }
      });
      break;
    }
  }
}

export function orderBalancedMove(fromId: string, toId: string) {
  if (!state.world.hasLane(fromId, toId)) return;

  const order = {
    type: Orders.BALANCED_MOVE,
    message: `Balanced move from ${fromId} to ${toId}`,
    toId,
    fromId,
    playerId: state.thisPlayerId!
  } satisfies Order;

  globalThis.gameManager.takeOrder(order);
}

export function orderMassMove(fromId: string, toId: string) {
  if (!state.world.hasLane(fromId, toId)) return;

  const order = {
    type: Orders.MASS_MOVE,
    toId,
    fromId,
    playerId: state.thisPlayerId!,
    message: `Mass move from ${fromId} to ${toId}`
  } satisfies Order;

  globalThis.gameManager.takeOrder(order);
}
