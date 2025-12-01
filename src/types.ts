export type Coordinates = [number, number];

export const SystemTypes = {
  INHABITED: 'inhabited',
  UNINHABITED: 'uninhabited'
} as const;

export type SystemType = (typeof SystemTypes)[keyof typeof SystemTypes];

export const Orders = {
  MASS_MOVE: 'MASS_MOVE',
  BALANCED_MOVE: 'BALANCED_MOVE'
};

export type OrderType = (typeof Orders)[keyof typeof Orders];

export interface System {
  id: string;
  type: SystemType;
  location: Coordinates;
  ownerId: string | null;
  ships: number;
  homeworld: string | null;
  moveQueue: Move[];
  lastMove: Move | null;
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
}

export interface PlayerStats {
  playerId: string;
  systems: number;
  ships: number;
  homeworld: number;
}

export interface Messages {
  id: number;
  message: string;
  tick: number;
  html: string;
}

export interface BotInterface {
  name: string;
  makeMoves(): void;
}

export interface Player {
  id: string;
  name: string;
  bot?: BotInterface;
  stats: PlayerStats;
  color: string;
  isAlive: boolean;
  visitedSystems: Set<string>;
  revealedSystems: Set<string>;
}
