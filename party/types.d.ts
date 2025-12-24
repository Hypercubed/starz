export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  rank: number;
}

export interface LeaderboardPostBody {
  type: 'increment' | 'decrement';
  uid: string;
  name: string;
}