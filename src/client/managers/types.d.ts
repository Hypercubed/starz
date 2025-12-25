import type { EventBus } from '../classes/EventBus.ts';
import type { GameConfig, GameState } from '../game/types';
import type { Player } from '../types';

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'PAUSED';

export interface GameContext {
  tick: number;
  status: Readonly<GameStatus>;
  config: Readonly<GameConfig>;
  playerId: string;
}

export interface FnContext {
  S: GameState; // TODO: make readonly
  E: Pick<EventBus<GameEventMap>, 'emit'>;
  C: Readonly<GameContext>;
  P: Readonly<Player> | null; // Player can be null for spectators
}

export interface WorldJSON {
  systems: Array<[string, System]>;
  lanes: Array<[string, Lane]>;
}
