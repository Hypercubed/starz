import type { GameState } from '../game/types';
import type { GameStatus } from '../managers/types';
import type { Move, Order } from '../types';

export interface GameEventMap {
  GAME_INIT: undefined;
  GAME_START: undefined;
  GAME_STOP: undefined;

  // State Updates
  STATE_UPDATED: { state: GameState; status: GameStatus };
  
  // Player Events
  PLAYER_ELIMINATED: { playerId: string; winnerId: string | null };
  PLAYER_WIN: { playerId: string };
  PLAYER_LOSE: { playerId: string; winnerId: string | null };
  
  // UI Events
  UI_QUIT: undefined;
  UI_PAUSE_TOGGLE: undefined;

  // Actions
  MAKE_MOVE: Move;
  TAKE_ORDER: Order;
}
