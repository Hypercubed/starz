export type Coordinates = [number, number];

export const SystemTypes = {
  INHABITED: 'inhabited',
  UNINHABITED: 'uninhabited'
} as const;

export type SystemType = (typeof SystemTypes)[keyof typeof SystemTypes];

export interface System {
  id: number;
  type: SystemType;
  location: Coordinates;
  owner: number | null;
  isVisited: boolean;
  isRevealed: boolean;
  ships: number;
  homeworld: number | null;
  moveQueue: Move[];
  lastMove: Move | null;
}

export interface Move {
  message?: string;
  ships: number;
  toIndex: number;
}

export interface Lane {
  id: string;
  fromIndex: number;
  toIndex: number;
}

export interface PlayerStats {
  player: number;
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
  id: number;
  name: string;
  isHuman: boolean;
  bot?: BotInterface;
  stats: PlayerStats;
}
