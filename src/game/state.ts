import { ENABLE_FOG_OF_WAR, NumBots, NumOfSystems } from '../constants.ts';

import { createWorld, getAdjacentSystems } from './world.ts';

import type { Messages, Player } from '../types.d.ts';
import type { GameConfig, GameState, System } from './types.d.ts';

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
    tick: 0, // TODO: move to C object
    world: createWorld(),
    players: [] as Player[],
    playerMap: new Map<string, Player>(),
    messages: [] as Messages[] // TODO: Move out of state, make a UI thing
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

export function addPlayer(state: GameState, player: Player) {
  state.players.push(player);
  state.playerMap.set(player.id, player);
  return state;
}

export function getPlayersHomeworld(state: GameState) {
  const { C } = globalThis.gameManager!.getContext();
  if (!C.playerId) return null;
  return state.world.systems.find((system) => system.homeworld === C.playerId);
}

export function revealSystem(state: GameState, system: System) {
  const { P } = globalThis.gameManager!.getContext();

  P.revealedSystems.add(system.id);
  P.visitedSystems.add(system.id);

  const neighbors = getAdjacentSystems(state.world, system.id);
  if (!neighbors) return;

  neighbors.forEach((neighbor) => {
    P.revealedSystems.add(neighbor.id);
    P.visitedSystems.add(neighbor.id);
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
