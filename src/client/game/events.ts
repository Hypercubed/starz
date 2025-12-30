import type { Move, Order } from './types';
import { createEvent, type EventMap } from '../managers/classes/event-bus.ts';

export const createGameEvents = () => {
  return {
    GAME_INIT: createEvent<void>(),
    GAME_STARTED: createEvent<void>(),
    GAME_STOPPED: createEvent<void>(),
    GAME_TICK: createEvent<{ tick: number }>(),

    STATE_UPDATED: createEvent<void>(),
    CONFIG_UPDATED: createEvent<void>(),

    PLAYER_UPDATED: createEvent<{ playerId: string }>(),
    PLAYER_ELIMINATED: createEvent<{
      loserId: string;
      winnerId: string | null;
    }>(),
    PLAYER_WON: createEvent<{
      playerId: string;
      message: string;
    }>(),
    PLAYER_LOST: createEvent<{
      playerId: string;
      winnerId: string | null;
    }>(),

    PROCESS_ORDER: createEvent<Order>(),
    MOVE_COMPLETED: createEvent<Move>(),

    LOG: createEvent<{ message: string; params?: any[] }>()
  } as const satisfies EventMap;
};

export type GameEventsMap = ReturnType<typeof createGameEvents>;
