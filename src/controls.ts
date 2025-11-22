import * as d3 from "d3";
import { pauseToggle } from "./engine";
import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
} from "./render";
import { state } from "./state";
import { orderBalancedMove, orderMassMove, revealSystem } from "./actions";
import { PLAYER } from "./constants";
import { showHelp } from "./ui";
import { debugLog } from "./logging";
import type { Lane, System } from "./types";

const ROTATION_STEP = 5;

export function setupKeboardControls() {
  d3.select("body").on("keypress", null);

  d3.select("body").on("keypress", (event) => {
    switch (event.key) {
      case " ":
        pauseToggle();
        break;
      case "h":
        centerOnHome();
        rerender();
        break;
      case "c":
        if (state.lastSelectedSystem) {
          centerOnSystem(state.lastSelectedSystem);
          rerender();
        }
        break;
      case "R":
        state.systems.forEach(revealSystem);
        rerender();
        break;
      case "+":
        state.timeScale = Math.min(16, state.timeScale * 2);
        debugLog(`Time scale increased to ${state.timeScale}x`);
        break;
      case "-":
        state.timeScale = Math.max(0.25, state.timeScale / 2);
        debugLog(`Time scale decreased to ${state.timeScale}x`);
        break;
      case "C":
        state.systems.forEach((system) => {
          if (system.owner === PLAYER) {
            system.ships *= 2;
          }
        });
        rerender();
        break;
      case "?":
        showHelp();
        break;
      case "p":
        changeView();
        centerOnHome();
        rerender();
        break;
      case "w":
        rotateProjection([0, ROTATION_STEP]);
        rerender();
        break;
      case "a":
        rotateProjection([-ROTATION_STEP, 0]);
        rerender();
        break;
      case "s":
        rotateProjection([0, -ROTATION_STEP]);
        rerender();
        break;
      case "d":
        rotateProjection([ROTATION_STEP, 0]);
        rerender();
        break;
      case "q":
        rotateProjection([0, 0, ROTATION_STEP]);
        rerender();
        break;
      case "e":
        rotateProjection([0, 0, -ROTATION_STEP]);
        rerender();
        break;
      // case 's':
      //   startNewGame();
      //   break;
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

function removeSystemSelect(system: System) {
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
        new Set([...state.selectedSystems, ...path]),
      );
      state.lastSelectedSystem = system;
      return;
    }
    for (const lane of current.lanes) {
      const neighbor = lane.from === current ? lane.to : lane.from;
      if (!visited.has(neighbor) && neighbor.owner === PLAYER) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
}

export function onClickLane(event: PointerEvent, lane: Lane) {
  if (!state.running) return;

  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: {
      // Right click
      let from = lane.from;
      let to = lane.to;

      if (from.owner !== PLAYER && to.owner !== PLAYER) return; // Can't move if neither side is owned by player
      if (from.owner !== PLAYER) {
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
        if (to.owner === PLAYER) {
          addSystemSelect(to);
        }
      }
      break;
    }
  }
  rerender();
}

export function onClickSystem(event: PointerEvent, system: System) {
  if (!state.running) return;

  switch (event.button) {
    case 0: // Left click
      if (system.owner !== PLAYER) return;

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
        if (system.owner !== PLAYER) return;

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
