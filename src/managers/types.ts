export const GAME_STATE = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
  PAUSED: 'PAUSED'
} as const;

export type GameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];
