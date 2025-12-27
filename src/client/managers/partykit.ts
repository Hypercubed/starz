import { unpack } from 'msgpackr';
import { PartySocket } from 'partysocket';
import { customAlphabet } from 'nanoid';

import { LocalGameManager } from './local.ts';

import type { LeaderboardEntry, LeaderboardPostBody } from '../../server/types';
import type { Player } from '../types';
import { PartyServerMessageTypes } from '../../server/shared.ts';

const FRIENDLY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';

const createPlayerId = customAlphabet(FRIENDLY_ALPHABET, 15);
const createPlayerToken = customAlphabet(FRIENDLY_ALPHABET, 15);

const PartySocketConfig = {
  host: import.meta.env.VITE_PARTYKIT_HOST,
  party: 'lobby-server',
  room: 'leaderboard'
};

export class PartykitGameManager extends LocalGameManager {
  lobbySocket?: PartySocket;
  playerToken!: string;

  private playkitConnect() {
    this.lobbySocket = new PartySocket(PartySocketConfig);
    this.#registerPlaykitEvents();
  }

  async start() {
    localStorage.setItem('starz_playerToken', this.playerToken);
    super.start();
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.playerToken}`
    };
  }

  async loadPlayerFromPlaykit(
    playerId: string
  ): Promise<Partial<Player> | null> {
    const playerEntry = await this.getScore(playerId);
    if (playerEntry) {
      return {
        id: playerId,
        name: playerEntry.name,
        score: { score: playerEntry.score, rank: playerEntry.rank }
      };
    }
    return null;
  }

  protected async initializePlayer() {
    console.log('Initializing player...');

    this.playkitConnect();
    const player = await super.initializePlayer();

    // Ensure playerToken and playerId are set
    this.playerId = createPlayerId();
    player.id = this.playerId;
    this.playerToken = localStorage.getItem('starz_playerToken')!;

    if (this.playerToken && player.id) {
      const playerData = await this.loadPlayerFromPlaykit(player.id);
      this.playerId = player.id ?? player.id;
      player.id = playerData?.id ?? player.id;
      player.name = playerData?.name ?? player.name;
      player.score = playerData?.score ?? player.score;
    }

    return player;
  }

  async getScore(playerId: string): Promise<LeaderboardEntry | undefined> {
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

    if (!this.playerToken) {
      this.playerToken = createPlayerToken();
    }

    const res = await PartySocket.fetch(
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

    const updatedEntry = (await res.json()) as LeaderboardEntry | null;
    if (updatedEntry) {
      thisPlayer.score = {
        score: updatedEntry.score,
        rank: updatedEntry.rank
      };
    }
    this.events.emit('PLAYER_UPDATED', { player: thisPlayer });
  }

  async setPlayerAuth(playerId: string, playerToken: string) {
    if (playerToken && playerId) {
      this.playerId = playerId;
      this.playerToken = playerToken;

      const playerData = await this.loadPlayerFromPlaykit(playerId);
      this.thisPlayer.id = playerData?.id ?? this.thisPlayer.id;
      this.thisPlayer.name = playerData?.name ?? this.thisPlayer.name;
      this.thisPlayer.score = playerData?.score ?? this.thisPlayer.score;

      this.updatePlayerName(this.thisPlayer.name);
    }

    localStorage.setItem('starz_playerToken', this.playerToken);
    localStorage.setItem('starz_playerId', this.playerId);
    localStorage.setItem('starz_playerName', this.thisPlayer.name);
  }

  async loadLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.lobbySocket) return [];

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
        case PartyServerMessageTypes.LEADERBOARD_UPDATED:
          this.events.emit('LEADERBOARD_UPDATED', { leaderboard: data.data });
          break;
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
