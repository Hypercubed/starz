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
}

export interface BotInterface {
  name: string;
  makeMoves(): void;
}

interface scoreInterface {
  score: number; // win-loss score
  tick?: number; // best tick achieved
}

export interface Player {
  id: string;
  name: string;
  bot?: BotInterface;
  stats: PlayerStats;
  score: scoreInterface;
  color: string;
  isAlive: boolean;
  visitedSystems: Set<string>;
  revealedSystems: Set<string>;
}
