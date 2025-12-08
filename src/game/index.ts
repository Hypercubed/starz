import { checkVictory, gameTick } from '../game/engine.ts';
import { generateMap, assignSystem } from '../game/generate.ts';
import {
  getPlayersHomeworld,
  revealAllSystems,
  revealSystem,
  addMessage,
  addPlayer,
  initalState,
  defaultConfig,
  queueMove
} from '../game/state.ts';
import { debugLog } from '../utils/logging.ts';

import { eliminatePlayer, moveShips, orderToMove } from './actions.ts';

import type { GameState, Move } from './types.d.ts';
import type { FnContext } from '../managers/types.d.ts';

export function setup(ctx: FnContext): GameState {
  const state = initalState();
  generateMap({ ...ctx, S: state });
  return state;
}

export const moves = {
  makeMove(ctx: FnContext, move: Move) {
    if (move.playerId === ctx.C.playerId) {
      debugLog(`player move: ${JSON.stringify(move)}`);
    }
    const from = ctx.S.world.systemMap.get(move.fromId)!;
    const to = ctx.S.world.systemMap.get(move.toId)!;
    moveShips(ctx, from, to, move.ships);
    from.lastMove = move;

    // return ctx.S;
  }
};

export {
  initalState,
  defaultConfig,
  gameTick,
  generateMap,
  getPlayersHomeworld,
  revealAllSystems,
  revealSystem,
  addMessage,
  assignSystem,
  checkVictory,
  addPlayer,
  eliminatePlayer,
  queueMove,
  orderToMove
};
