import { init } from '@paralleldrive/cuid2';
import { ConvexClient } from 'convex/browser';

import { api } from '../../convex/_generated/api';

import type { Player } from '../types';
import { LocalGameManager } from './local.ts';

const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

const createId = init({ length: 5 });

export class ConvexGameManager extends LocalGameManager {
  protected async initializePlayer() {
    const playerId = (this.playerId =
      localStorage.getItem('starz_playerId') ?? createId());
    const playerName = this.config.playerName;

    localStorage.setItem('starz_playerId', playerId);
    localStorage.setItem('starz_playerName', playerName);

    const score = await client.query(api.leaderboard.getMyBestScore, {
      playerId
    });

    return {
      id: playerId,
      name: playerName,
      score: score ?? { score: 0 }
    } satisfies Partial<Player>;
  }

  protected async submitWinLoss(deltaScore: number) {
    const playerId = this.playerId;
    const player = this.state.playerMap.get(this.playerId)!;
    const playerName = player.name;
    const tick = this.tick;

    try {
      await client.mutation(api.leaderboard.submitScore, {
        playerId,
        playerName,
        tick,
        deltaScore
      });
      console.log('Score submitted!');
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  }
}