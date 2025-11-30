import { Graph } from '../classes/graph.ts';
import type { Messages, Player, System } from '../types.ts';

export const state = {
  tick: 0,
  timeScale: 1,
  running: false,
  thisPlayerId: null as string | null,
  selectedSystems: [] as System[],
  lastSelectedSystem: null as System | null,
  world: new Graph(),
  players: [] as Player[],
  playerMap: new Map<string, Player>(),
  messages: [] as Messages[]
};

export function resetState() {
  state.tick = 0;
  state.thisPlayerId = null;
  state.selectedSystems = [];
  state.lastSelectedSystem = null;
  state.timeScale = 1;
  state.world = new Graph();
  state.players = [];
  state.messages = [] as Messages[];
  state.playerMap.clear();
}

let messageIdCounter = 0;

export function addMessage(message: string) {
  const html = `${message} <small>${~~(state.tick / 2)}${state.tick % 2 === 1 ? '.' : ''}</small>`;
  state.messages.push({
    id: messageIdCounter++,
    message,
    tick: state.tick,
    html
  });
}

export function thisPlayer(): Player | undefined {
  return state.playerMap.get(state.thisPlayerId!);
}

export function addPlayer(player: Player) {
  state.players.push(player);
  state.playerMap.set(player.id, player);
}

export function getPlayersHomeworld() {
  if (!state.thisPlayerId) return null;
  return state.world.systems.find(
    (system) => system.homeworld === state.thisPlayerId
  );
}

export function revealSystem(system: System) {
  const playerId = state.thisPlayerId;
  if (!playerId) return;

  const player = state.playerMap.get(playerId)!;

  player.revealedSystems.add(system.id);
  player.visitedSystems.add(system.id);

  const neighbors = state.world.getAdjacentSystems(system);

  if (!neighbors) return;
  neighbors.forEach((neighbor) => {
    player.revealedSystems.add(neighbor.id);
    player.visitedSystems.add(neighbor.id);
  });
}

export function queueMove(
  from: System,
  to: System,
  ships: number,
  playerId: string,
  message?: string
) {
  from.moveQueue.push({
    ships,
    toId: to.id,
    fromId: from.id,
    playerId,
    message
  });
}

export function clearSelection() {
  state.selectedSystems = [];
  state.lastSelectedSystem = null;
}

export function toggleSingleSystemSelect(system: System) {
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

export function toggleSystemSelect(system: System) {
  if (state.selectedSystems.includes(system)) {
    removeSystemSelect(system);
  } else {
    addSystemSelect(system);
  }
}

export function addSystemSelect(system: System) {
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
