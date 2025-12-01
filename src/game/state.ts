import { Graph } from '../classes/graph.ts';
import type { Messages, Player, System } from '../types.ts';

export const state = {
  tick: 0,
  timeScale: 1,
  running: false,
  thisPlayerId: null as string | null,
  selectedSystems: new Set<string>(),
  lastSelectedSystem: null as string | null, // TODO: Make this an id
  world: new Graph(),
  players: [] as Player[],
  playerMap: new Map<string, Player>(),
  messages: [] as Messages[]
};

export function resetState() {
  state.tick = 0;
  state.thisPlayerId = null;
  state.selectedSystems = new Set<string>();
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
  if (!player) return;

  player.revealedSystems.add(system.id);
  player.visitedSystems.add(system.id);

  const neighbors = state.world.getAdjacentSystems(system.id);

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
  state.selectedSystems.clear();
  state.lastSelectedSystem = null;
}

export function toggleSingleSystemSelect(systemId: string) {
  if (state.selectedSystems.size === 1 && state.selectedSystems.has(systemId)) {
    clearSelection();
  } else {
    // Select only this system
    state.selectedSystems.clear();
    state.selectedSystems.add(systemId);
    state.lastSelectedSystem = systemId;
  }
}

export function toggleSystemSelect(systemId: string) {
  if (state.selectedSystems.has(systemId)) {
    removeSystemSelect(systemId);
  } else {
    addSystemSelect(systemId);
  }
}

export function addSystemSelect(systemId: string) {
  if (!state.selectedSystems.has(systemId)) {
    state.selectedSystems.add(systemId);
    state.lastSelectedSystem = systemId;
  }
}

export function removeSystemSelect(systemId: string) {
  state.selectedSystems.delete(systemId);
  if (state.lastSelectedSystem === systemId) {
    state.lastSelectedSystem = null;
  }
}
