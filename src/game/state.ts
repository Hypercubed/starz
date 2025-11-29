import { Graph } from '../classes/graph.ts';
import type { Messages, Player, System } from '../types.ts';

export const state = {
  tick: 0,
  timeScale: 1,
  running: false,
  thisPlayer: null as string | null,
  selectedSystems: [] as System[],
  lastSelectedSystem: null as System | null,
  world: new Graph(),
  players: [] as Player[],
  playerMap: new Map<string, Player>(),
  messages: [] as Messages[]
};

export function resetState() {
  state.tick = 0;
  state.thisPlayer = null;
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

export function addPlayer(player: Player) {
  state.players.push(player);
  state.playerMap.set(player.id, player);
}

export function getPlayersHomeworld() {
  if (!state.thisPlayer) return null;
  return state.world.systems.find(
    (system) => system.homeworld === state.thisPlayer
  );
}
