import type { GameStatus } from '../managers/types.d.ts';
import type { Move, Order, Player } from '../types.d.ts';

export interface GameEventMap {
  GAME_INIT: undefined;
  GAME_START: undefined;
  GAME_STOP: undefined;

  // State Updates
  STATE_UPDATED: { state: GameState; status: GameStatus };

  // Player Events
  PLAYER_ELIMINATED: { loserId: string; winnerId: string | null };
  PLAYER_WIN: { playerId: string; message: string };
  PLAYER_LOSE: { playerId: string; winnerId: string | null };
  PLAYER_QUIT: { playerId: string };

  // Actions
  TAKE_ORDER: Order;
  MAKE_MOVE: Move;
}

export interface GameConfig {
  playerName: string;
  numBots: number;
  fow: boolean;
  numSystems: number;
  timeScale: number;
}

export interface GameState {
  world: World;
  playerMap: Map<string, Player>;
}

export interface World {
  systemMap: Map<string, System>;
  laneMap: Map<string, Lane>;
  neighborMap: Map<string, Array<string>>;
}

export type SystemType = 'INHABITED' | 'UNINHABITED';

export type OrderType = 'MASS_MOVE' | 'BALANCED_MOVE';

export type Coordinates = [number, number];

export interface System {
  id: string;
  type: SystemType;
  location: Coordinates;
  ownerId: string | null;
  ships: number;
  homeworld: string | null;
  moveQueue: Move[];
  lastMove: Move | null;
  movement: [number, number]; // [ships moving in, ships moving out]
}

export interface Order {
  type: OrderType;
  playerId: string;
  fromId: string;
  toId: string;
  message?: string;
}

export interface Move {
  playerId: string;
  ships: number;
  fromId: string;
  toId: string;
  message?: string;
}

export interface Lane {
  id: string;
  fromId: string;
  toId: string;
  movement: [number, number]; // [ships moving fwd, ships moving bak]
}
