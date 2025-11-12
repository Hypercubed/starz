export type Coordinates = [number, number];

export interface System {
  id: number;
  location: Coordinates;
  lanes: Lane[];
  owner: number | null;
  isInhabited: boolean;
  isRevealed: boolean;
  ships: number;
  homeworld: number | null;
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
  ships: number,
  homeworld: number
};

export interface BotMove {
  type: 'exterminate' | 'explore' | 'expand';
  from: System;
  to: System;
}

export interface Messages {
  id: number;
  message: string;
  tick: number;
  html: string;
}