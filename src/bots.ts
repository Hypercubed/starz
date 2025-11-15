import { queueMove } from "./actions";
import { NumBots, NumHumanPlayers } from "./constants";
import { state } from "./state";
import type { BotMove, System } from "./types";

export function botQueue() {
  const totalPlayers = NumHumanPlayers + NumBots;

  for (let player = NumHumanPlayers + 1; player <= totalPlayers + 1; player++) {
    basicBot(player);
  }
}

function basicBot(player: number) {
  const botSystems = state.systems.filter((system) => system.owner === player);

  botSystems.forEach((system) => {
    system.moveQueue = []; // Clear previous moves
  });

  // Smart bot should:
  // - Have agressive and defensive modes
  // - Prioritize attacking weak systems
  // - Rush to exterminate homeworlds
  // - Rush to protect own homeworld

  const eXterminate = getExterminateMoves(botSystems, player);
  if (eXterminate.length > 0) {
    chooseMoves(eXterminate);
  }

  const eXplore = getExploreMoves(botSystems);
  if (eXplore.length > 0) {
    chooseMoves(eXplore);
  }

  const eXpand = getExpandMoves(botSystems, player);
  if (eXpand.length > 0) {
    chooseMoves(eXpand);
  }
}

function getExterminateMoves(systems: System[], player: number) {
  return systems.map((from) => {
    if (from.moveQueue.length > 0) return []; // Already has a move queued

    if (from.ships < 3) return [];
    if (from.homeworld === player) return []; // Don't attack from homeworlds

    return from.lanes.flatMap((lane) => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner === player || to.owner === null) return [];
      if (from.ships - 1 <= to.ships) return [];
      return [{ to, from, type: "exterminate" } satisfies BotMove];
    });
  });
}

function getExploreMoves(systems: System[]) {
  return systems.map((from) => {
    if (from.moveQueue.length > 0) return []; // Already has a move queued
    if (from.ships < 2) return [];
    if (from.homeworld !== null && from.ships < 5) return []; // Keep more ships on homeworlds

    return from.lanes.flatMap((lane) => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner !== null) return [];
      return [{ to, from, type: "explore" } satisfies BotMove];
    });
  });
}

function getExpandMoves(systems: System[], player: number) {
  return systems.map((from) => {
    if (from.moveQueue.length > 0) return []; // Already has a move queued
    if (from.ships <= 2) return [];
    if (from.homeworld !== null && from.ships < 5) return []; // Keep more ships on homeworlds

    return from.lanes.flatMap((lane) => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner !== player) return [];
      if (to.ships > from.ships + 1) return [];
      return [{ from, to, type: "expand" } satisfies BotMove];
    });
  });
}

function chooseMoves(moves: BotMove[][]) {
  moves.forEach((systemMoves) => {
    // For each system's possible moves, pick one at random
    if (systemMoves.length === 0) return;
    const move = systemMoves[Math.floor(Math.random() * systemMoves.length)];
    if (move.from.moveQueue.length > 0) return; // Already has a move queued

    switch (move.type) {
      case "exterminate": {
        const attackingShips = move.from.ships! - 1;
        queueMove(move.from, move.to, attackingShips);
        break;
      }
      case "explore": {
        const attackingShips = Math.floor(move.from.ships / 2);
        queueMove(move.from, move.to, attackingShips);
        break;
      }
      case "expand": {
        const deltaShips = Math.floor((move.from.ships - move.to.ships) / 2);
        queueMove(move.from, move.to, deltaShips);
        break;
      }
    }
  });
}
