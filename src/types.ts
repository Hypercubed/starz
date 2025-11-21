export type Coordinates = [number, number];

export type SystemType = "inhabited" | "uninhabited";

export interface System {
  id: number;
  type: SystemType;
  location: Coordinates;
  lanes: Lane[];
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
  to: System;
}

export interface Lane {
  id: string;
  from: System;
  to: System;
  isRevealed: boolean;
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
