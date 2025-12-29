export interface PlayerStats {
  playerId: string;
  systems: number;
  ships: number;
  homeworld: number;
}

export interface Messages {
  message: string;
  tick: number;
}

export interface BotInterface {
  name: string;
  makeMoves(): void;
}

export interface ScoreInterface {
  score: number; // win-loss score
  tick?: number; // best tick achieved
  rank?: number; // current rank
}

export interface Player {
  id: string;
  name: string;
  bot?: BotInterface;
  stats: PlayerStats;
  score: ScoreInterface;
  color: string;
  isAlive: boolean;
  visitedSystems: Set<string>;
  revealedSystems: Set<string>;
}
