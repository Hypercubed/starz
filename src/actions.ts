import { PLAYER } from "./constants";
import { rerender } from "./render";
import { addMessage, state } from "./state";
import type { Lane, System } from "./types";

export function onClickLane(event: PointerEvent, lane: Lane) {
  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: // Right click
      state.selectedSystems.forEach((selectedSystem) => {
        if (selectedSystem !== lane.from && selectedSystem !== lane.to) return;

        let from = lane.from;
        let to = lane.to;

        if (from !== selectedSystem) {
          const s = from;
          from = to;
          to = s;
        }
        orderBalancedMove(from, to);
      });
      break;
  }
  rerender();
}

function toggleSingleSystemSelect(system: System) {
  if (
    state.selectedSystems.length === 1 &&
    state.selectedSystems[0] === system
  ) {
    // Deselect
    state.selectedSystems = [];
    state.lastSelectedSystem = null;
  } else {
    // Select only this system
    state.selectedSystems = [system];
    state.lastSelectedSystem = system;
  }
}

function toggleSystemSelect(system: System) {
  if (state.selectedSystems.includes(system)) {
    state.selectedSystems = state.selectedSystems.filter((s) => s !== system);
    if (state.lastSelectedSystem === system) {
      state.lastSelectedSystem = null;
    }
  } else {
    state.selectedSystems.push(system);
    state.lastSelectedSystem = system;
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

export function onClickSystem(event: PointerEvent, system: System) {
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
    case 2: // Right click
      state.selectedSystems.forEach((selectedSystem) => {
        orderMassMove(selectedSystem, system);
      });
      break;
  }

  rerender();
}

function orderBalancedMove(from: System, to: System) {
  // Check if there's a lane between selectedSystem and system
  const lane = state.lanes.find(
    (l) => (l.from === from && l.to === to) || (l.to === from && l.from === to),
  );

  if (lane) {
    // TODO: This should only balance ships if both systems are owned by the player
    // otherwise it should attack with half the ships
    const deltaShips = Math.floor(((from.ships ?? 0) - (to.ships ?? 0)) / 2);
    moveShips(from, to, deltaShips);

    if (to.owner === PLAYER) {
      addSystemSelect(to);
    }
  }
}

function orderMassMove(from: System, to: System) {
  // Check if there's a lane between selectedSystem and system
  const lane = state.lanes.find(
    (l) => (l.from === from && l.to === to) || (l.to === from && l.from === to),
  );

  if (lane) {
    const deltaShips = from.ships - 1;
    moveShips(from, to, deltaShips);

    if (to.owner === PLAYER) {
      removeSystemSelect(from);
      addSystemSelect(to);
    }
  }
}

function moveShips(from: System, to: System, ships: number) {
  if (ships < 1) return;
  if (from.ships! < ships) return;

  if (to.owner === from.owner) {
    transferShips(from, to, ships);
  } else {
    attackSystem(from, to, ships);
  }
}

function attackSystem(from: System, to: System, attackingShips: number) {
  const player = from.owner!;
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

function takeSystem(player: number, system: System) {
  system.owner = player;
  if (player === PLAYER) revealSystem(system);

  if (system.homeworld && system.homeworld !== player) {
    addMessage(
      `Player ${player} has taken over the homeworld of Player ${system.homeworld}!`,
    );
    eliminatePlayer(player, system.homeworld);
    system.homeworld = 0; // No longer a homeworld
  }
}

function eliminatePlayer(winner: number, loser: number) {
  // Take over homeworld, other systems and 50% of ships
  state.systems.forEach((s) => {
    if (s.owner === loser) {
      s.owner = winner;
      s.ships = Math.floor((s.ships ?? 0) / 2);
      if (winner === PLAYER) revealSystem(s);
    }
  });
}

export function revealSystem(system: System) {
  system.isRevealed = true;
  system.lanes.forEach((lane) => {
    lane.isRevealed = true;
    lane.from.isRevealed = true;
    lane.to.isRevealed = true;
  });
}

function transferShips(from: System, to: System, ships: number) {
  if (from.ships < ships) return; // Not enough ships to transfer
  from.ships -= ships;
  to.ships += ships;
  if (to.owner === PLAYER) revealSystem(to);
}

export function queueMove(from: System, to: System, ships: number) {
  if (from.ships < ships) return;
  from.moveQueue.push({ ships, from, to });
}

export function doQueuedMoves() {
  state.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      moveShips(move.from, move.to, move.ships);
    }
  });
}
