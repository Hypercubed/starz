import { init } from '@paralleldrive/cuid2';
import { unpack } from 'msgpackr';
import { PartySocket } from 'partysocket';

import { LocalGameManager } from './local.ts';

import type { LeaderboardEntry, LeaderboardPostBody } from '../../server/types';
import type { GameConfig } from '../game/types';
import type { Player } from '../types';

const createPlayerId = init({ length: 15 });
const createPlayerToken = init({ length: 15 });

const PartySocketConfig = {
  host: import.meta.env.VITE_PARTYKIT_HOST,
  party: 'lobby-server',
  room: import.meta.env.VITE_PARTYKIT_LEADERBOARD
};

export class PartykitGameManager extends LocalGameManager {
  lobbySocket?: PartySocket;
  user: Partial<LeaderboardEntry> | null = null;

  playerToken!: string;

  private playkitConnect() {
    this.lobbySocket = new PartySocket(PartySocketConfig);
    this.#registerPlaykitEvents();
  }

  async start() {
    const thisPlayer = this.state.playerMap.get(this.playerId)!;

    thisPlayer.name = this.user?.name ?? thisPlayer.name;
    thisPlayer.score = {
      score: this.user?.score ?? 0,
      rank: this.user?.rank ?? undefined
    };
    thisPlayer.id = this.user?.uid ?? thisPlayer.id;

    localStorage.setItem('starz_playerToken', this.playerToken);
    localStorage.setItem('starz_rank', this.user?.rank?.toString() ?? '');

    this.state.playerMap.clear();
    this.addPlayer(thisPlayer); // Ensure player is added, ID may have changed

    super.start();
  }

  async setConfig(partialConfig: Partial<GameConfig>) {
    const playerName = partialConfig.playerName;

    // TODO: Make this seperate from config setting
    if (playerName && playerName.includes('::')) {
      const [playerId, playerToken] = playerName.split('::');
      await this.loadPlayer(playerToken, playerId);
      delete partialConfig.playerName;
      partialConfig.playerName = this.user?.name ?? this.config.playerName;
    }

    await super.setConfig(partialConfig);
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.playerToken}`
    };
  }

  async loadPlayer(playerToken: string, playerId: string) {
    // TODO: Enforce authentication

    this.playerToken = playerToken;

    this.user ??= { uid: playerId };
    this.user.score ??= 0;

    const playerEntry = await this.getScore(playerId);
    if (playerEntry) {
      this.user.uid = playerId;
      this.user.score = playerEntry.score;
      this.user.rank = playerEntry.rank;
      this.user.name = playerEntry.name;

      localStorage.setItem('starz_playerToken', this.playerToken);
      localStorage.setItem('starz_playerId', playerId);
      localStorage.setItem(
        'starz_playerName',
        this.user.name ?? this.config.playerName
      );
      localStorage.setItem('starz_score', this.user.score?.toString() ?? '0');
      localStorage.setItem('starz_rank', this.user.rank?.toString() ?? '');
    }

    // Update current player in state if exists
    const thisPlayer = this.state.playerMap.get(this.playerId);
    if (thisPlayer) {
      thisPlayer.id = playerId;
      thisPlayer.name = this.user.name ?? thisPlayer.name;
      thisPlayer.score = {
        score: this.user.score ?? 0,
        rank: this.user.rank ?? undefined
      };
      this.state.playerMap.delete(this.playerId);
      this.state.playerMap.set(playerId, thisPlayer);
    }

    this.playerId = playerId;
  }

  protected async initializePlayer() {
    console.log('Initializing player...');

    this.playkitConnect();

    this.playerToken = localStorage.getItem('starz_playerToken')!;
    this.playerId = localStorage.getItem('starz_playerId')!;
    let playerName =
      localStorage.getItem('starz_playerName') ?? this.config.playerName;
    let score = +(localStorage.getItem('starz_score') ?? '0');
    let rank = localStorage.getItem('starz_rank')
      ? +localStorage.getItem('starz_rank')!
      : undefined;

    if (this.playerToken && this.playerId) {
      await this.loadPlayer(this.playerToken, this.playerId);
      this.playerId = this.user?.uid ?? this.playerId;
      playerName = this.user?.name ?? playerName;
      score = this.user?.score ?? score;
      rank = this.user?.rank ?? rank;
    }

    // Ensure playerToken and playerId are set
    this.playerToken ??= createPlayerToken();
    this.playerId ??= createPlayerId();

    localStorage.setItem('starz_playerToken', this.playerToken);
    localStorage.setItem('starz_playerId', this.playerId);
    localStorage.setItem('starz_playerName', playerName);
    localStorage.setItem('starz_score', score.toString());
    localStorage.setItem('starz_rank', rank?.toString() ?? '');

    const leaderboard = await this.loadLeaderboard();
    console.log('Current Leaderboard:');
    console.table(leaderboard);

    return {
      id: this.playerId,
      name: playerName,
      score: { score, rank }
    } satisfies Partial<Player>;
  }

  private async getScore(
    playerId: string
  ): Promise<LeaderboardEntry | undefined> {
    if (!this.lobbySocket) return;

    const response = await PartySocket.fetch(
      {
        ...PartySocketConfig,
        path: 'score',
        query: { playerId }
      },
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );
    return await response.json();
  }

  protected async submitWinLoss(deltaScore: number) {
    super.submitWinLoss(deltaScore);

    if (!this.lobbySocket) return;

    if (deltaScore === 0) return;

    console.assert(
      deltaScore === 1 || deltaScore === -1,
      'deltaScore must be 1 or -1'
    );

    const thisPlayer = this.state.playerMap.get(this.playerId);
    if (!thisPlayer) return;

    const body = {
      type: deltaScore > 0 ? 'increment' : 'decrement',
      uid: this.playerId,
      name: thisPlayer.name
    } satisfies LeaderboardPostBody;

    PartySocket.fetch(
      {
        ...PartySocketConfig,
        path: 'score'
      },
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: this.getHeaders()
      }
    );
  }

  async loadLeaderboard() {
    if (!this.lobbySocket) return null;

    const response = await PartySocket.fetch(
      { ...PartySocketConfig },
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return await response.json();
  }

  #registerPlaykitEvents() {
    if (!this.lobbySocket) return null;

    this.lobbySocket!.addEventListener('message', async (event) => {
      const data =
        event.data instanceof Blob
          ? unpack(await event.data.arrayBuffer())
          : JSON.parse(event.data);

      switch (data.type) {
        default:
          if ('message' in data) {
            console.log(data.message);
          } else if ('error' in data) {
            console.error('PartyKit error:', data.error);
          }
          break;
        // Handle other message types as needed
      }
    });
  }
}
