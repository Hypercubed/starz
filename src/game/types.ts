import type { Graph } from '../classes/graph';
import type { Messages, Move, Order, Player } from '../types';

export interface GameConfig {
  playerName: string;
  numBots: number;
  fow: boolean;
  numSystems: number;
}

export interface GameState {
  tick: number;
  timeScale: number;
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
