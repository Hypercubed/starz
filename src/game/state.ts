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
    world: createWorld(),
    playerMap: new Map<string, Player>(),
    messages: [] as Messages[] // TODO: Move out of state, make a UI thing
  };
}

export function addPlayer(state: GameState, player: Player) {
  state.playerMap.set(player.id, player);
}

export function getPlayersHomeworld(state: GameState) {
  const { C } = globalThis.gameManager!.getContext();
  if (!C.playerId) return null;

  for (const system of state.world.systemMap.values()) {
    if (system.homeworld === C.playerId) return system;
  }

  return null;
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
  state.world.systemMap.forEach((system) => revealSystem(state, system));
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
