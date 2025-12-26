import { ENABLE_FOG_OF_WAR, NumOfSystems } from '../constants.ts';

import { createWorld, getAdjacentSystems } from './world.ts';

import type { Player } from '../types';
import type { GameConfig, GameState, System } from './types';
import { generateName } from '../utils/names.ts';

export function defaultConfig(): GameConfig {
  return {
    playerName: generateName(),
    numBots: 0,
    fow: ENABLE_FOG_OF_WAR,
    numSystems: NumOfSystems,
    timeScale: 1
  };
}

export function initalState(): GameState {
  return {
    world: createWorld(),
    playerMap: new Map<string, Player>()
  };
}

export function addPlayer(state: GameState, player: Player) {
  state.playerMap.set(player.id, player);
}

export function getPlayersHomeworld(state: GameState) {
  const { C } = globalThis.gameManager!.getFnContext();
  if (!C.playerId) return null;

  for (const system of state.world.systemMap.values()) {
    if (system.homeworld === C.playerId) return system;
  }

  return null;
}

export function visitSystem(state: GameState, system: System) {
  const { P } = globalThis.gameManager!.getFnContext();
  if (!P) return;

  P.revealedSystems.add(system.id);
  P.visitedSystems.add(system.id);

  const neighbors = getAdjacentSystems(state.world, system.id);
  if (!neighbors) return;
  neighbors.forEach((neighbor) => P.revealedSystems.add(neighbor.id));
  return state;
}

export function revealAllSystems(state: GameState) {
  const { P } = globalThis.gameManager!.getFnContext();
  if (!P) return;

  for (const system of state.world.systemMap.values()) {
    P.revealedSystems.add(system.id);
  }
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
