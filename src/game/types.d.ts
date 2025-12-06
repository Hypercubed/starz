import type { Graph } from '../classes/graph';
import type { GameStatus } from '../managers/types';
import type { Messages, Move, Order, Player } from '../types';

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

export interface GameConfig {
  playerName: string;
  numBots: number;
  fow: boolean;
  numSystems: number;
  timeScale: number;
}

export interface GameState {
  tick: number;
  running: boolean;
  thisPlayerId: string | null;
  world: Graph;
  players: Player[];
  playerMap: Map<string, Player>;
  messages: Messages[];
}

export interface GameEvents {
  eliminatePlayer: (loserId: string, winnerId: string | null) => void;
  makeMove: (move: Move) => void;
  takeOrder: (order: Order) => void;
  // playerLose: (winner: string | null) => void;
  // playerWin: () => void;
  // stopGame: () => void;
  // onSystemClick: (event: PointerEvent, system: System) => void;
  // onLaneClick: (event: PointerEvent, lane: Lane) => void;
  // quit: () => Promise<boolean>;
  // startGame: () => void;
  // gameTick: () => void;
}
