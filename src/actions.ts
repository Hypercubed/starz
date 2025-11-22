import { PLAYER } from "./constants";
import { stopGame } from "./engine";
import { trackEvent } from "./logging";
import { addMessage, state } from "./state";
import type { System } from "./types";

export function orderBalancedMove(from: System, to: System) {
  // Check if there's a lane between selectedSystem and system
  const lane = state.lanes.find(
    (l) => (l.from === from && l.to === to) || (l.to === from && l.from === to),
  );

  if (lane) {
    const deltaShips =
      to.owner === from.owner
        ? Math.floor((from.ships - to.ships) / 2)
        : Math.floor(from.ships / 2);

    console.log("Balanced move:", {
      from: from.ships,
      to: to.ships,
      deltaShips,
    });

    moveShips(from, to, deltaShips);
  }
}

export function orderMassMove(from: System, to: System) {
  // Check if there's a lane between selectedSystem and system
  const lane = state.lanes.find(
    (l) => (l.from === from && l.to === to) || (l.to === from && l.from === to),
  );

  if (lane) {
    const deltaShips = from.ships - 1;
    moveShips(from, to, deltaShips);

    // if (to.owner === PLAYER) {
    //   removeSystemSelect(from);
    //   addSystemSelect(to);
    // }
  }
}

function moveShips(from: System, to: System, ships: number) {
  if (ships === 0) return;
  if (ships < 0) {
    const s = from;
    from = to;
    to = s;
    ships = -ships;
  }
  if (from.ships < ships) return;

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
    const loser = system.homeworld;
    addMessage(
      `Player ${player} has taken over the homeworld of Player ${loser}!`,
    );
    system.homeworld = 0; // No longer a homeworld
    eliminatePlayer(player, loser);
  }
}

function eliminatePlayer(winner: number, loser: number) {
  // Take over homeworld, other systems and 50% of ships
  state.systems.forEach((s) => {
    if (s.owner === loser) {
      s.owner = winner;
      s.ships = Math.max(Math.floor((s.ships ?? 0) / 2), 1);
      s.homeworld = 0; // No longer a homeworld
      if (winner === PLAYER) revealSystem(s);
    }
  });

  if (loser === PLAYER) {
    addMessage(`You have lost your homeworld! Game Over.`);
    state.lastSelectedSystem = null;
    state.selectedSystems = [];
    trackEvent("starz_gamesLost", { winner });
    stopGame();
  }
}

export function revealSystem(system: System) {
  system.isRevealed = true;
  system.isVisited = true;
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

export function queueMove(
  from: System,
  to: System,
  ships: number,
  message?: string,
) {
  from.moveQueue.push({ ships, to, message });
}

export function doQueuedMoves() {
  state.systems.forEach((system) => {
    const move = system.moveQueue.shift();
    if (move) {
      moveShips(system, move.to, move.ships);
      system.lastMove = move;
    }
  });
}
