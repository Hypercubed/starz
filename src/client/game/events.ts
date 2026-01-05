import type { Move, Order } from './types';
import { MiniSignal } from 'mini-signals';

export const createGameEvents = () => {
  return {
    GAME_INIT: new MiniSignal<[void]>(),
    GAME_STARTED: new MiniSignal<[void]>(),
    GAME_STOPPED: new MiniSignal<[void]>(),
    GAME_TICK: new MiniSignal<[{ tick: number }]>(),

    STATE_UPDATED: new MiniSignal<[void]>(),
    CONFIG_UPDATED: new MiniSignal<[void]>(),

    PLAYER_UPDATED: new MiniSignal<[{ playerId: string }]>(),
    PLAYER_ELIMINATED: new MiniSignal<[{
      loserId: string;
      winnerId: string | null;
    }]>(),
    PLAYER_WON: new MiniSignal<[{
      playerId: string;
      message: string;
    }]>(),
    PLAYER_LOST: new MiniSignal<[{
      playerId: string;
      winnerId: string | null;
    }]>(),

    PROCESS_ORDER: new MiniSignal<[Order]>(),
    MOVE_COMPLETED: new MiniSignal<[Move]>(),

    LOG: new MiniSignal<[{
      message: string;
      params?: any[];
    }]>()
  };
};

export type GameEventsMap = ReturnType<typeof createGameEvents>;
