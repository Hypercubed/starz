import { doMove } from "./actions";
import { NumBots } from "./constants";
import { state } from "./state";
import type { BotMove, System } from "./types";

export function botsMove() {
  for (let player = 2; player <= NumBots + 1; player++) {
    basicBot(player);
  }
}

function basicBot(player: number) {
  const botSystems = state.systems.filter(system => system.owner === player);

  // *** eXterminate ***
  const attackLanes = getExterminateMoves(botSystems, player);
  if (attackLanes.length > 0) {
    chooseMove(attackLanes);
    return;
  }

  // *** eXplore ***
  const explore = getExploreMoves(botSystems);
  if (explore.length > 0) {
    chooseMove(explore);
    return;
  }

  // *** eXpand ***
  const expand = getExpandMoves(botSystems, player);
  if (expand.length > 0) {
    chooseMove(expand);
    return;
  }
}

function getExterminateMoves(systems: System[], player: number) {
  return systems.flatMap(from => {
    if (from.ships < 3) return [];
    
    return from.lanes.flatMap(lane => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner === player || to.owner === null) return [];
      if (from.ships <= to.ships) return [];
      return [{ to, from, type: 'exterminate' } satisfies BotMove];
    });
  });
}

function getExploreMoves(systems: System[]) {
  return systems.flatMap(from => {
    if (from.ships < 2) return [];

    return from.lanes.flatMap(lane => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner !== null) return [];
      return [{ to, from, type: 'explore' } satisfies BotMove];
    });
  });
}

function getExpandMoves(systems: System[], player: number) {
  return systems.flatMap(from => {
    if (from.ships <= 2) return undefined;

    return from.lanes.flatMap(lane => {
      const to = lane.from === from ? lane.to : lane.from;
      if (to.owner !== player) return undefined;
      if (to.ships >= from.ships) return undefined;
      return [{ from, to, type: 'expand' } satisfies BotMove];
    });
  }).filter(m => m !== undefined);
}

function chooseMove(moves: BotMove[]) {
  const move = moves[Math.floor(Math.random() * moves.length)];
  doMove(move);
}