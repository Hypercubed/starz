import {
  doQueuedMoves,
  eliminatePlayer,
  orderToMove,
  takeOrder
} from './actions.ts';
import { checkVictory, gameTick } from './engine.ts';
import { generateMap, assignSystem } from './generate.ts';
import {
  getPlayersHomeworld,
  revealAllSystems,
  visitSystem,
  addPlayer,
  initalState,
  defaultConfig,
  queueMove
} from './state.ts';
import {
  buildNeighborMap,
  createWorld,
  findClosestSystem,
  hasLane,
  worldFromJson,
  worldToJson
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
  hasLane,
  worldToJson,
  worldFromJson
};
