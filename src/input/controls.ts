import * as d3 from 'd3';

import { pauseToggle } from '../core/engine.ts';
import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
  scaleZoom
} from '../render/render.ts';
import { state } from '../game/state.ts';
import {
  revealSystem
} from '../game/actions.ts';
import {
  ENABLE_BOT_CONTROL,
  ENABLE_CHEATS,
  PLAYER
} from '../core/constants.ts';
import { showEndGame, showHelp } from '../render/ui.ts';
import { debugLog } from '../utils/logging.ts';
import type { Lane, Move, System } from '../types.ts';
import { GAME_STATE } from '../services/game-manager.ts';

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
            if (system.ownerIndex === PLAYER) {
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
        showEndGame('Restart?');
        return;
      }
    }
  });

  d3.select('body').on('keypress.controls', (event) => {
    // debugLog("Key pressed:", event);

    switch (event.code) {
      case 'Space':
        pauseToggle();
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

function clearSelection() {
  state.selectedSystems = [];
  state.lastSelectedSystem = null;
}

function toggleSingleSystemSelect(system: System) {
  if (
    state.selectedSystems.length === 1 &&
    state.selectedSystems[0] === system
  ) {
    clearSelection();
  } else {
    // Select only this system
    state.selectedSystems = [system];
    state.lastSelectedSystem = system;
  }
}

function toggleSystemSelect(system: System) {
  if (state.selectedSystems.includes(system)) {
    removeSystemSelect(system);
  } else {
    addSystemSelect(system);
  }
}

function addSystemSelect(system: System) {
  if (!state.selectedSystems.includes(system)) {
    state.selectedSystems.push(system);
    state.lastSelectedSystem = system;
  }
}

export function removeSystemSelect(system: System) {
  state.selectedSystems = state.selectedSystems.filter((s) => s !== system);
  if (state.lastSelectedSystem === system) {
    state.lastSelectedSystem = null;
  }
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
      if (!visited.has(neighbor) && neighbor.ownerIndex === PLAYER) {
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
      let from = state.world.systems[lane.fromIndex];
      let to = state.world.systems[lane.toIndex];

      if (from.ownerIndex !== PLAYER && to.ownerIndex !== PLAYER && !ENABLE_BOT_CONTROL)
        return; // Can't move if neither side is owned by player
      if (from.ownerIndex !== PLAYER) {
        // Make sure 'from' is owned by player
        const s = from;
        from = to;
        to = s;
      }

      orderBalancedMove(from, to);

      if (!event.altKey) {
        if (!event.ctrlKey && !event.shiftKey) {
          clearSelection();
        }

        addSystemSelect(from);
        if (to.ownerIndex === PLAYER) {
          addSystemSelect(to);
        }
      }
      break;
    }
  }
  rerender();
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
      if (system.ownerIndex !== PLAYER && !ENABLE_BOT_CONTROL) return;

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
        if (system.ownerIndex !== PLAYER && !ENABLE_BOT_CONTROL) return;

        if (!event.altKey) {
          if (!event.ctrlKey && !event.shiftKey) {
            clearSelection();
          }
          addSystemSelect(system);
        }
      });
      break;
  }

  rerender();
}

export function orderBalancedMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips =
    to.ownerIndex === from.ownerIndex
      ? Math.floor((from.ships - to.ships) / 2)
      : Math.floor(from.ships / 2);

  const move = {
    message: `Move ${deltaShips} ships from ${from.id} to ${to.id}`,
    ships: deltaShips,
    toIndex: to.index,
    fromIndex: from.index,
    playerIndex: PLAYER
  } satisfies Move;

  window.gameManager.makeMove(move);
}

export function orderMassMove(from: System, to: System) {
  if (!state.world.hasLane(from, to)) return;

  const deltaShips = from.ships - 1;

  const move = {
    message: `Move ${deltaShips} ships from ${from.id} to ${to.id}`,
    ships: deltaShips,
    toIndex: to.index,
    fromIndex: from.index,
    playerIndex: PLAYER
  } satisfies Move;

  window.gameManager.makeMove(move);
}