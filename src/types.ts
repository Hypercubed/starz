export type Coordinates = [number, number];

export type SystemType = "inhabited" | "uninhabited";

export interface System {
  id: number;
  type: SystemType;
  location: Coordinates;
  lanes: Lane[];
  owner: number | null;
  isRevealed: boolean;
  ships: number;
  homeworld: number | null;
  moveQueue: Move[];
}

export interface Move {
  ships: number;
  from: System;
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

export interface BotMove {
  type: "exterminate" | "explore" | "expand";
  from: System;
  to: System;
}

export interface Messages {
  id: number;
  message: string;
  tick: number;
  html: string;
}
