import { checkVictory, gameTick } from '../game/engine.ts';
import { generateMap, assignSystem } from '../game/generate.ts';
import {
  getPlayersHomeworld,
  revealAllSystems,
  revealSystem,
  addMessage,
  addPlayer,
  initalState,
  defaultConfig
} from '../game/state.ts';
import { debugLog } from '../utils/logging.ts';

import { eliminatePlayer, moveShips, orderToMove } from './actions.ts';

import type { GameState, Move, Order } from './types.d.ts';
import type { FnContext } from '../managers/types.d.ts';

export function setup(ctx: FnContext): GameState {
  const state = initalState();
  generateMap({ ...ctx, G: state });
  return state;
}

export const moves = {
  makeMove(ctx: FnContext, move: Move) {
    if (move.playerId === ctx.G.thisPlayerId) {
      debugLog(`player move: ${JSON.stringify(move)}`);
    }
    const from = ctx.G.world.systemMap.get(move.fromId)!;
    const to = ctx.G.world.systemMap.get(move.toId)!;
    moveShips(ctx, from, to, move.ships);
    from.lastMove = move;

    // return ctx.G;
  }
};

export const utilities = {
  takeOrder(ctx: FnContext, order: Order) {
    if (order.playerId === ctx.G.thisPlayerId) {
      debugLog(`player order: ${JSON.stringify(order)}`);
    }
    return orderToMove(ctx.G, order);
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
  eliminatePlayer
};
