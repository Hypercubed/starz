import { PartySocket } from 'partysocket';
import type {
  LeaderboardEntry,
  LeaderboardPostBody
} from '../../../server/types';
import { createPlayerToken } from '../../utils/ids';
import { unpack } from 'msgpackr';
import { PartyServerMessageTypes } from '../../../server/shared';
import { EventBus } from '../../classes/event-bus';
import { MiniSignal } from 'mini-signals';

const PartyLobbyConfig = {
  host: import.meta.env.VITE_PARTYKIT_HOST,
  party: 'lobby-server',
  room: 'leaderboard'
};

type EventsMap = {
  readonly LEADERBOARD_UPDATED: MiniSignal<
    [{ leaderboard: LeaderboardEntry[] }]
  >;
};

export class PartykitGameLobby extends EventBus<EventsMap> {
  constructor() {
    super({
      LEADERBOARD_UPDATED: new MiniSignal<
        [{ leaderboard: LeaderboardEntry[] }]
      >()
    });
  }

  lobbySocket?: PartySocket;
  playerToken: string | null = null;

  connect() {
    this.lobbySocket = new PartySocket(PartyLobbyConfig);
    this.#registerEvents();
    this.playerToken = localStorage.getItem('starz_playerToken');
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.playerToken ?? ''}`
    };
  }

  setPlayerToken(token: string) {
    this.playerToken = token;
    localStorage.setItem('starz_playerToken', token);
  }

  async getScore(playerId: string): Promise<LeaderboardEntry | undefined> {
    if (!this.lobbySocket) return;

    const response = await PartySocket.fetch(
      {
        ...PartyLobbyConfig,
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

  async submitDeltaScore(
    uid: string,
    name: string,
    deltaScore: number
  ): Promise<LeaderboardEntry> {
    if (!this.lobbySocket) throw new Error('Not connected to lobby');
    if (deltaScore !== 1 && deltaScore !== -1)
      throw new Error('deltaScore must be 1 or -1');

    const body = {
      type: deltaScore > 0 ? 'increment' : 'decrement',
      uid,
      name
    } satisfies LeaderboardPostBody;

    this.playerToken ??= createPlayerToken();
    localStorage.setItem('starz_playerToken', this.playerToken);

    const res = await PartySocket.fetch(
      {
        ...PartyLobbyConfig,
        path: 'score'
      },
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: this.getHeaders()
      }
    );

    return await res.json();
  }

  async loadLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.lobbySocket) return [];

    const response = await PartySocket.fetch(PartyLobbyConfig, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  }

  #registerEvents() {
    if (!this.lobbySocket) return;

    this.lobbySocket!.addEventListener('message', async (event) => {
      const data =
        event.data instanceof Blob
          ? unpack(await event.data.arrayBuffer())
          : JSON.parse(event.data);

      switch (data.type) {
        case PartyServerMessageTypes.LEADERBOARD_UPDATED:
          this.events.LEADERBOARD_UPDATED.dispatch({ leaderboard: data.data });
          break;
        default:
          if ('message' in data) {
            console.log(data.message);
          } else if ('error' in data) {
            console.error('PartyKit error:', data.error);
          }
          break;
      }
    });
  }
}
