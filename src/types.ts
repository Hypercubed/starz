export type Coordinates = [number, number];

export const SystemTypes = {
  INHABITED: 'inhabited',
  UNINHABITED: 'uninhabited'
} as const;

export type SystemType = (typeof SystemTypes)[keyof typeof SystemTypes];

export interface System {
  id: string;
  index: number;
  type: SystemType;
  location: Coordinates;
  ownerIndex: number | null;
  isVisited: boolean;
  isRevealed: boolean;
  ships: number;
  homeworld: number | null;
  moveQueue: Move[];
  lastMove: Move | null;
}

export interface Move {
  playerIndex: number;
  message?: string;
  ships: number;
  fromIndex: number;
  toIndex: number;
}

export interface Lane {
  id: string;
  index: number;
  fromIndex: number;
  toIndex: number;
}

export interface PlayerStats {
  playerIndex: number;
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
  index: number;
  name: string;
  isHuman: boolean;
  bot?: BotInterface;
  stats: PlayerStats;
}
