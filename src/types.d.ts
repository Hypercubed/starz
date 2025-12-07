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
