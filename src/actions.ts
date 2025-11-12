import { PLAYER } from "./constants";
import { rerender } from "./render";
import { addMessage, state } from "./state";
import type { BotMove, Lane, System } from "./types";

export function onClickLane(event: PointerEvent, lane: Lane) {
  switch (event.button) {
    case 0: // Left click
      // No action on left click for lanes
      break;
    case 2: // Right click
      if (!state.selectedSystem) return;
      if (state.selectedSystem !== lane.from && state.selectedSystem !== lane.to) return;

      let from = lane.from;
      let to = lane.to;

      if (from !== state.selectedSystem) {
        const s = from;
        from = to;
        to = s;
      }

      let deltaShips = 0;
      if (to.owner === from.owner) {
        // Transfer ships - move half the difference
        deltaShips = Math.floor((from.ships - to.ships) / 2);
      } else {
        // Attack - move half the ships
        deltaShips = Math.floor(from.ships / 2);
      }

      moveShips(from, to, deltaShips);

      // To system now belongs to player, select it
      // if (to.owner === PLAYER) {
      //   state.selectedSystem = to;
      // } else {
      //   state.selectedSystem = from;
      // }
      break;
  }
  rerender();
}

export function onClickSystem(event: PointerEvent, system: System) {
  switch (event.button) {
    case 0: // Left click
      if (system.owner !== PLAYER) return;
      if (state.selectedSystem === system) {
        state.selectedSystem = null;
      } else {
        state.selectedSystem = system;
      }
      break;
    case 2: // Right click
      if (state.selectedSystem) {
        // Check if there's a lane between selectedSystem and system
        const lane = state.lanes.find(l =>
          (l.from === state.selectedSystem && l.to === system) ||
          (l.to === state.selectedSystem && l.from === system)
        );

        if (lane) {
          const from = state.selectedSystem;
          const to = system;
          const deltaShips = from.ships - 1;

          moveShips(from, to, deltaShips);

          // To system now belongs to player, select it
          if (to.owner === PLAYER) {
            state.selectedSystem = to;
          } else {
            state.selectedSystem = from;
          }
        }
      }
      break;
  }

  rerender();
}

function moveShips(from: System, to: System, ships: number) {
  if (ships < 1) return;

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
    addMessage(`Player ${player} has taken over the homeworld of Player ${system.homeworld}!`);
    eliminatePlayer(player, system.homeworld);
    system.homeworld = 0; // No longer a homeworld
  }
}

function eliminatePlayer(winner: number, loser: number) {
  // Take over homeworld, other systems and 50% of ships
  state.systems.forEach(s => {
    if (s.owner === loser) {
      s.owner = winner;
      s.ships = Math.floor((s.ships ?? 0) / 2);
      if (winner === PLAYER) revealSystem(s);
    }
  });
}

export function revealSystem(system: System) {
  system.isRevealed = true;
  system.lanes.forEach(lane => {
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

export function doMove(move: BotMove) {
  switch (move.type) {
    case 'exterminate': {
      const attackingShips = move.from.ships! - 1;
      attackSystem(move.from, move.to, attackingShips);
      break;
    }
    case 'explore': {
      const attackingShips = Math.floor((move.from.ships ?? 0) / 2);
      attackSystem(move.from, move.to, attackingShips);
      break;
    }
    case 'expand': {
      const deltaShips = Math.floor(((move.from.ships ?? 0) - (move.to.ships ?? 0)) / 2);
      transferShips(move.from, move.to, deltaShips);
      break;
    }
  }
}