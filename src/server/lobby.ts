import { routePartykitRequest, Server } from 'partyserver';

import type { LeaderboardEntry, LeaderboardPostBody } from './types';
import type { Connection } from 'partyserver';

type LeaderboardItem = Omit<LeaderboardEntry, 'rank'> & { secret: string };
type LeaderboardMap = Map<string, LeaderboardItem>;

const STORAGE_LEADERBOARD_KEY = 'starz-game-room-leaderboard';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Define your Server
export class LobbyServer extends Server {
  private leaderboard!: LeaderboardMap;

  async onStart() {
    // await this.room.storage.put<LeaderboardMap>(STORAGE_LEADERBOARD_KEY, new Map<string, LeaderboardItem>());
    this.leaderboard =
      (await this.ctx.storage.get<LeaderboardMap>(STORAGE_LEADERBOARD_KEY)) ??
      new Map<string, LeaderboardItem>();
  }

  async saveLeaderboard() {
    await this.ctx.storage.put<LeaderboardMap>(
      STORAGE_LEADERBOARD_KEY,
      this.leaderboard ?? new Map<string, LeaderboardItem>()
    );
  }

  onConnect(connection: Connection) {
    console.log('Connected', connection.id, 'to server', this.name);
  }

  onMessage(connection: Connection, message: string) {
    console.log('Message from', connection.id, ':', message);
    // Send the message to every other connection
    this.broadcast(message, [connection.id]);
  }

  async onRequest(req: Request) {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: HEADERS
      });
    }

    const url = new URL(req.url);

    if (url.pathname.endsWith('/score') && req.method === 'GET') {
      return this.onRequestScore(req);
    }

    if (url.pathname.endsWith('/score') && req.method === 'POST') {
      return this.onRequestUpdateScore(req);
    }

    if (req.method === 'GET') {
      // Get leaderboard
      return new Response(JSON.stringify(this.getPublicLeaderboard()), {
        status: 200,
        headers: HEADERS
      });
    }

    return new Response(
      JSON.stringify({ message: 'Hello from LobbyServer!' }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }

  // Used to the current player's score
  private onRequestScore(req: Request) {
    // Later enforce authentication?

    const query = new URL(req.url).searchParams;
    const playerId = query.get('playerId');
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: Missing playerId' }),
        { status: 400, headers: HEADERS }
      );
    }

    const playerEntry = this.leaderboard.get(playerId) as
      | LeaderboardEntry
      | undefined;

    if (playerEntry) {
      const leaderboard = this.getRankedLeaderboard();
      const playerIndex = leaderboard.findIndex(
        (entry) => entry.uid === playerId
      );
      if (playerIndex !== -1) {
        playerEntry.rank = playerIndex + 1;
      }
    }

    return new Response(JSON.stringify(playerEntry ?? null), {
      status: 200,
      headers: HEADERS
    });
  }

  private async onRequestUpdateScore(req: Request) {
    const payload = (await req.json()) as LeaderboardPostBody;
    const { type, uid, name } = payload;

    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: HEADERS
      });
    }

    let entry = this.leaderboard.get(uid);
    if (!entry) {
      entry = {
        uid,
        name,
        secret,
        score: 0
      };
      this.leaderboard.set(uid, entry);
    } else if (entry.secret !== secret) {
      console.log('Unauthorized score update attempt for uid:', uid);
      console.log('Provided secret:', secret, 'Expected secret:', entry.secret);
      return new Response('Unauthorized', { status: 401 });
    }

    if (type === 'increment') {
      entry.score += 1;
    } else if (type === 'decrement') {
      entry.score -= 1;
    } else {
      return new Response('Bad Request: Invalid type', { status: 400 });
    }

    entry.uid = uid; // Update uid on score change
    entry.name = name; // Update name on score change

    await this.saveLeaderboard();
    return new Response('OK', {
      headers: HEADERS
    });
  }

  private getRankedLeaderboard(): LeaderboardEntry[] {
    return Array.from(this.leaderboard.values())
      .sort((a, b) => b.score - a.score)
      .map(({ name, uid, score }, index) => ({
        rank: index + 1,
        name,
        uid,
        score
      }));
  }

  private getPublicLeaderboard(): LeaderboardEntry[] {
    // Return leaderboard WITHOUT playerToken
    return this.getRankedLeaderboard().slice(0, 20);
  }
}

export default {
  // Set up your fetch handler to use configured Servers
  async fetch(request: Request, env: any): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response('Not Found', { status: 404 })
    );
  }
};
