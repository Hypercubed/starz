import { Graph } from '../classes/graph.ts';
import type { Messages, Player, System } from '../types.ts';

export const state = {
  tick: 0,
  timeScale: 1,
  running: false,
  selectedSystems: [] as System[],
  lastSelectedSystem: null as System | null,
  world: new Graph(),
  players: [] as Player[],
  messages: [] as Messages[]
};

export function resetState() {
  state.tick = 0;
  state.selectedSystems = [];
  state.lastSelectedSystem = null;
  state.timeScale = 1;
  state.world = new Graph();
  state.players = [];
  state.messages = [] as Messages[];
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
