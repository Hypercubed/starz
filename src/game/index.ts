import { checkVictory, gameTick } from '../game/engine.ts';
import { generateMap, assignSystem } from '../game/generate.ts';
import {
  getPlayersHomeworld,
  revealAllSystems,
  revealSystem,
  addPlayer,
  initalState,
  defaultConfig,
  queueMove
} from '../game/state.ts';

import { eliminatePlayer, orderToMove, takeOrder } from './actions.ts';

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
  revealSystem,
  assignSystem,
  checkVictory,
  addPlayer,
  eliminatePlayer,
  queueMove,
  orderToMove,
  takeOrder
};
