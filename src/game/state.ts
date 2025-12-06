import { Graph } from '../classes/graph.ts';
import { ENABLE_FOG_OF_WAR, NumBots, NumOfSystems } from '../constants.ts';

import type { Messages, Player, System } from '../types.ts';
import type { GameConfig, GameState } from './types.ts';

export function defaultConfig(): GameConfig {
  return {
    playerName: 'Player',
    numBots: NumBots,
    fow: ENABLE_FOG_OF_WAR,
    numSystems: NumOfSystems,
    timeScale: 1
  };
}

export function initalState(): GameState {
  return {
    tick: 0,
    running: false, // TODO: rmove this
    thisPlayerId: null as string | null,
    world: new Graph(), // TODO: don't use classes in state
    players: [] as Player[],
    playerMap: new Map<string, Player>(),
    messages: [] as Messages[] // TODO: Move out of state
  };
}

let messageIdCounter = 0;

export function addMessage(state: GameState, message: string) {
  const html = `${message} <small>${~~(state.tick / 2)}${state.tick % 2 === 1 ? '.' : ''}</small>`;
  state.messages.push({
    id: messageIdCounter++,
    message,
    tick: state.tick,
    html
  });

  return state;
}

export function clearMessages(state: GameState) {
  state.messages = [];
  return state;
}

export function thisPlayer(state: GameState): Player | undefined {
  return state.playerMap.get(state.thisPlayerId!);
}

export function addPlayer(state: GameState, player: Player) {
  state.players.push(player);
  state.playerMap.set(player.id, player);
  return state;
}

export function getPlayersHomeworld(state: GameState) {
  if (!state.thisPlayerId) return null;
  return state.world.systems.find(
    (system) => system.homeworld === state.thisPlayerId
  );
}

export function revealSystem(state: GameState, system: System) {
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

  return state;
}

export function revealAllSystems(state: GameState) {
  state.world.systems.forEach((system) => revealSystem(state, system));
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
