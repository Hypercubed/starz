import type { GameEvents, GameState } from '../game/types';

export const GAME_STATUS = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
  PAUSED: 'PAUSED'
} as const;

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export interface GameContext {
  gameState: GameStatus;
}

export interface FnContext {
  G: GameState;
  E: GameEvents;
  C: GameContext;
}
