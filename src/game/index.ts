import {
  getPlayersHomeworld,
  revealAllSystems,
  revealSystem,
  addMessage,
  addPlayer,
  initalState
} from '../game/state.ts';
import { generateMap, assignSystem } from '../game/generate.ts';
import { checkVictory, gameTick } from '../game/engine.ts';
import { eliminatePlayer, moveShips, orderToMove } from './actions.ts';

import { debugLog } from '../utils/logging.ts';

import type { Move, Order } from '../types.ts';
import type { FnContext } from '../managers/types.ts';
import type { GameState } from './types.ts';

export function setup() {
  const state = initalState();
  generateMap(state);
  return state;
}

export const moves = {
  makeMove(ctx: FnContext, move: Move): GameState {
    if (move.playerId === ctx.G.thisPlayerId) {
      debugLog(`player move: ${JSON.stringify(move)}`);
    }
    const from = ctx.G.world.systemMap.get(move.fromId)!;
    const to = ctx.G.world.systemMap.get(move.toId)!;
    moveShips(ctx, from, to, move.ships);
    from.lastMove = move;

    return ctx.G;
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
