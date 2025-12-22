export interface LeaderboardEntry {
  playerId: string;
  playerToken: string;
  playerName: string;
  score: number;
  rank?: number;
}

export interface LeaderboardPostBody {
  type: 'increment' | 'decrement';
  playerId: string;
  playerToken: string;
  playerName: string;
}