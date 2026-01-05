import type { GameConfig, GameState } from '../game/types';
import type { Player } from '../types';
import type { MiniSignal } from 'mini-signals';

export type GameStatus = 'INIT' | 'WAITING' | 'PLAYING' | 'FINISHED' | 'PAUSED';

export interface GameContext {
  tick: number;
  status: Readonly<GameStatus>;
  config: Readonly<GameConfig>;
  playerId: string;
}

import type { GameManager } from './classes/manager';

export interface FnContext<T extends GameManager = GameManager> {
  S: GameState; // TODO: make readonly
  E: Pick<T, 'emit'>;
  C: Readonly<GameContext>;
  P: Readonly<Player> | null; // Player can be null for spectators
}

export interface WorldJSON {
  systems: Array<[string, System]>;
  lanes: Array<[string, Lane]>;
}

export interface ManagerFeatures {
  multiplayer: boolean;
  leaderboard: boolean;
}

export type GetEventMap<T> = {
  [K in keyof T]: T[K] extends MiniSignal<infer U> ? U : never;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};