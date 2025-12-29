import type { GameConfig, GameState, Move, Order } from './types';
import type { GameStatus } from '../managers/types';
import type { Player } from '../types';
import { createEvent, type EventMap } from '../classes/event-bus';

export const createGameEvents = () => {
  return {
    GAME_INIT: createEvent<void>(),
    GAME_START: createEvent<void>(),
    GAME_STOP: createEvent<void>(),
    GAME_TICK: createEvent<{ tick: number }>(),

    STATE_UPDATED: createEvent<{
      state: GameState;
      status: GameStatus;
    }>(),
    CONFIG_UPDATED: createEvent<{
      config: GameConfig;
    }>(),

    PLAYER_UPDATED: createEvent<{
      player: Player;
    }>(),
    PLAYER_ELIMINATED: createEvent<{
      loserId: string;
      winnerId: string | null;
    }>(),
    PLAYER_WIN: createEvent<{
      playerId: string;
      message: string;
    }>(),
    PLAYER_LOSE: createEvent<{
      playerId: string;
      winnerId: string | null;
    }>(),

    TAKE_ORDER: createEvent<Order>(),
    MAKE_MOVE: createEvent<Move>(),

    LOG: createEvent<{ message: string; params?: any[] }>()
  } as const satisfies EventMap;
};

export type GameEventsMap = ReturnType<typeof createGameEvents>;
