import type { GameConfig, GameState } from '../game/types';

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'PAUSED';

export interface GameContext {
  gameStatus: Readonly<GameStatus>;
  gameConfig: GameConfig; // TODO: make readonly
}

export interface FnContext {
  G: GameState; // TODO: make readonly
  C: GameContext;
}

export interface WorldJSON {
  systems: Array<System>;
  lanes: Array<Lane>;
}
