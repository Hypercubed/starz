import { init } from '@paralleldrive/cuid2';
import { PartySocket } from 'partysocket';

import { LocalGameManager } from './local.ts';

import type { LeaderboardPostBody } from '../../party/types.d.ts';
import type { Player } from '../types.d.ts';
import { unpack } from 'msgpackr';

const createPlayerId = init({ length: 4 });
const createPlayerToken = init({ length: 28 });

const PARTYKIT_WS_URL = import.meta.env.VITE_PARTYKIT_WS_URL;
const PARTYKIT_REST_URL = import.meta.env.VITE_PARTYKIT_REST_URL;
const PARTYKIT_LEADERBOARD = import.meta.env.VITE_PARTYKIT_LEADERBOARD;

export class PlaykitGameManager extends LocalGameManager {
  partySocket?: PartySocket;

  playerToken!: string;

  private async playkitConnect(
    playerId: string,
    playerToken: string,
    playerName: string
  ) {
    console.log('Connecting to PartyKit...');

    this.partySocket = new PartySocket({
      host: PARTYKIT_WS_URL,
      room: PARTYKIT_LEADERBOARD,
      query: {
        playerId,
        playerToken,
        playerName
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.partySocket!.onopen = () => {
        console.log('Connected to PartyKit');
        resolve();
      };
      this.partySocket!.onerror = (err) => {
        console.error('PartyKit connection error:', err);
        this.partySocket = undefined;
        reject(err);
      };
    });
  }

  protected async initializePlayer() {
    console.log('Initializing player...');

    this.playerToken =
      localStorage.getItem('starz_playerToken') ?? createPlayerToken();
    localStorage.setItem('starz_playerToken', this.playerToken);
    // TODO: Use this token to authenticate with PartyKit and load player data

    this.playerId = localStorage.getItem('starz_playerId') ?? createPlayerId();
    localStorage.setItem('starz_playerId', this.playerId);

    const playerName =
      localStorage.getItem('starz_playerName') ?? this.config.playerName;
    localStorage.setItem('starz_playerName', playerName);

    let score = +(localStorage.getItem('starz_score') ?? '0');
    localStorage.setItem('starz_score', score.toString());

    if (!this.partySocket) {
      try {
        // TODO: Get playerId and playerName from server using playerToken
        await this.playkitConnect(this.playerId, this.playerToken, playerName);
      } catch (err) {
        console.error('Failed to connect to PartyKit');
      }

      if (this.partySocket) {
        this.#registerPlaykitEvents();
  
        score = await new Promise((resolve) => {
          // TODO: Get ranking and score from PartyKit
          const onMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'init') {
              score = data.playerEntry?.score ?? 0;
              localStorage.setItem('starz_score', score.toString());
              this.partySocket!.removeEventListener('message', onMessage);
              resolve(score);
            }
          };
  
          this.partySocket!.addEventListener('message', onMessage);
        });
      }
    }

    console.log(`Player initialized: ${this.playerId} (${playerName}) with score ${score}`);

    return {
      id: this.playerId,
      name: playerName,
      score: { score }
    } satisfies Partial<Player>;
  }

  protected async submitWinLoss(deltaScore: number) {
    super.submitWinLoss(deltaScore);

    if (!this.partySocket) return;

    console.assert(
      deltaScore === 1 || deltaScore === -1,
      'deltaScore must be 1 or -1'
    );

    const thisPlayer = this.state.playerMap.get(this.playerId);
    if (!thisPlayer) return;

    const body = {
      type: deltaScore > 0 ? 'increment' : 'decrement',
      playerId: this.playerId,
      playerToken: this.playerToken,
      playerName: thisPlayer.name
    } satisfies LeaderboardPostBody;

    PartySocket.fetch(
      { host: PARTYKIT_REST_URL, room: PARTYKIT_LEADERBOARD },
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  async loadLeaderboard() {
    if (!this.partySocket) return null;

    const response = await PartySocket.fetch(
      { host: PARTYKIT_REST_URL, room: PARTYKIT_LEADERBOARD },
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
    if (!this.partySocket) return null;

    this.partySocket.addEventListener('message', async (event) => {
      const data =
        event.data instanceof Blob ?
          unpack(await event.data.arrayBuffer()) :
          JSON.parse(event.data);

      switch (data.type) {
        case 'init': {
          console.log('Connected to PartyKit with data:', data);
          console.log('Initial leaderboard data:');
          console.table(data.leaderboard);
          break;
        }
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
