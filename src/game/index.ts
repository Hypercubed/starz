import { checkVictory, gameTick } from '../game/engine.ts';
import { generateMap, assignSystem } from '../game/generate.ts';
import {
  getPlayersHomeworld,
  revealAllSystems,
  visitSystem,
  addPlayer,
  initalState,
  defaultConfig,
  queueMove
} from '../game/state.ts';

import {
  doQueuedMoves,
  eliminatePlayer,
  orderToMove,
  takeOrder
} from './actions.ts';
import {
  buildNeighborMap,
  createWorld,
  findClosestSystem,
  hasLane
} from './world.ts';

import type { GameState } from './types.d.ts';
import type { FnContext } from '../managers/types.d.ts';

export function setup(ctx: FnContext): GameState {
  const state = initalState();
  generateMap({ ...ctx, S: state });
  return state;
}

export {
  initalState,
  defaultConfig,
  gameTick,
  generateMap,
  getPlayersHomeworld,
  revealAllSystems,
  visitSystem,
  assignSystem,
  checkVictory,
  addPlayer,
  eliminatePlayer,
  queueMove,
  doQueuedMoves,
  orderToMove,
  takeOrder,
  findClosestSystem,
  createWorld,
  buildNeighborMap,
  hasLane
};
