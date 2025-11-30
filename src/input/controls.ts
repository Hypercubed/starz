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
import type { Lane, Move, System } from '../types.ts';
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
        window.gameManager.quit();
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    switch (event.code) {
      case 'Space':
        if (!('pauseToggle' in window.gameManager)) return;
        (window.gameManager as any).pauseToggle();
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

function selectPath(system: System) {
  if (state.lastSelectedSystem == null) return;

  // Simple BFS to find shortest path
  const queue: System[][] = [[state.lastSelectedSystem]];
  const visited = new Set<System>();
  visited.add(state.lastSelectedSystem);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === system) {
      // Found path
      state.selectedSystems = Array.from(
        new Set([...state.selectedSystems, ...path])
      );
      state.lastSelectedSystem = system;
      return;
    }
    for (const neighbor of state.world.getAdjacentSystems(current)) {
      if (!visited.has(neighbor) && neighbor.ownerId === state.thisPlayerId) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
}

export function onClickLane(event: PointerEvent, lane: Lane) {
  if (window.gameManager.gameState !== GAME_STATE.PLAYING) return;

  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: {
      // Right click
      let from = state.world.nodeMap.get(lane.fromId)!;
      let to = state.world.nodeMap.get(lane.toId)!;

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
      }

      orderBalancedMove(from, to);

      if (!event.altKey) {
        if (!event.ctrlKey && !event.shiftKey) clearSelection();
        addSystemSelect(from);
        if (to.ownerId === state.thisPlayerId) addSystemSelect(to);
      }
      break;
    }
  }
}

export function onClickSystem(event: PointerEvent, system: System) {
  if (window.gameManager.gameState !== GAME_STATE.PLAYING) return;

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
        toggleSystemSelect(system);
      } else if (event.shiftKey) {
        selectPath(system);
      } else {
        toggleSingleSystemSelect(system);
      }
      break;
    case -1: // Long press (touch)
    case 2: // Right click
      state.selectedSystems.forEach((selectedSystem) => {
        orderMassMove(selectedSystem, system);
        if (system.ownerId !== state.thisPlayerId && !ENABLE_BOT_CONTROL)
          return;

        if (!event.altKey) {
          if (!event.ctrlKey && !event.shiftKey) {
            clearSelection();
          }
          addSystemSelect(system);
        }
      });
      break;
  }
}

export function orderBalancedMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips =
    to.ownerId === from.ownerId
      ? Math.floor((from.ships - to.ships) / 2)
      : Math.floor(from.ships / 2);

  const move = {
    message: `Move ${deltaShips} ships from ${from.id} to ${to.id}`,
    ships: deltaShips,
    toId: to.id,
    fromId: from.id,
    playerId: state.thisPlayerId!
  } satisfies Move;

  window.gameManager.makeMove(move);
}

export function orderMassMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips = from.ships - 1;

  const move = {
    message: `Move ${deltaShips} ships from ${from.id} to ${to.id}`,
    ships: deltaShips,
    toId: to.id,
    fromId: from.id,
    playerId: state.thisPlayerId!
  } satisfies Move;

  window.gameManager.makeMove(move);
}
