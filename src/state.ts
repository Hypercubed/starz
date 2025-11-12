import type { Lane, Messages, PlayerStats, System } from "./types";

export const state = {
  tick: 0,
  timeScale: 1,
  selectedSystem: null as System | null,
  systems: [] as System[],
  lanes: [] as Lane[],
  playerStats: [] as PlayerStats[],
  messages: [] as Messages[]
};

export function resetState() {
  state.tick = 0;
  state.selectedSystem = null;
  state.timeScale = 1;
  state.lanes = [];
  state.systems = [];
  state.playerStats = [];
  state.messages = [] as Messages[];
}

let messageIdCounter = 0;

export function addMessage(message: string) {
  const html = `${message} <small>${~~(state.tick / 2)}${state.tick % 2 === 1 ? '.' : ''}</small>`;
  state.messages.push({ id: messageIdCounter++, message, tick: state.tick, html });
}