import type { EventBus } from '../classes/EventBus.ts';
import type { GameConfig, GameState } from '../game/types';

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'PAUSED';

export interface GameContext {
  status: Readonly<GameStatus>;
  config: Readonly<GameConfig>;
  playerId: string;
}

export interface FnContext {
  S: GameState; // TODO: make readonly
  E: Pick<EventBus<GameEventMap>, 'emit'>;
  C: Readonly<GameContext>;
  P: Readonly<Player>;
}

export interface WorldJSON {
  systems: Array<System>;
  lanes: Array<Lane>;
}
