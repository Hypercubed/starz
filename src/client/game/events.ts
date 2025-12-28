import { Event } from 'ts-typed-events';
import type { GameConfig, GameState, Move, Order } from './types';
import type { GameStatus } from '../managers/types';
import type { Messages, Player } from '../types';
import type { EventMap } from '../classes/event-bus';

export const createGameEvents = () => {
  return {
    GAME_INIT: new Event<void>(),
    GAME_START: new Event<void>(),
    GAME_STOP: new Event<void>(),
    GAME_TICK: new Event<{ tick: number }>(),

    STATE_UPDATED: new Event<{
      state: GameState;
      status: GameStatus;
    }>(),
    CONFIG_UPDATED: new Event<{ config: GameConfig }>(),
    MESSAGES_UPDATED: new Event<{ messages: Messages[] }>(),

    // PLAYER_JOINED: new Event<{ player: Player }>(),
    PLAYER_REMOVED: new Event<{ playerId: string }>(),
    PLAYER_UPDATED: new Event<{ player: Player }>(),
    PLAYER_ELIMINATED: new Event<{
      loserId: string;
      winnerId: string | null;
    }>(),
    PLAYER_WIN: new Event<{ playerId: string; message: string }>(),
    PLAYER_LOSE: new Event<{
      playerId: string;
      winnerId: string | null;
    }>(),

    // PLAYER_AUTH_UPDATED: new Event<{
    //   playerId: string;
    //   playerToken: string;
    // }>(),

    TAKE_ORDER: new Event<Order>(),
    MAKE_MOVE: new Event<Move>()
  } as const satisfies EventMap;
};

export type GameEventsMap = ReturnType<typeof createGameEvents>;
