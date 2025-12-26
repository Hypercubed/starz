import { routePartykitRequest, Server } from 'partyserver';

import type { LeaderboardEntry, LeaderboardPostBody } from './types';
import type { Connection } from 'partyserver';
import { PartyServerMessageTypes } from './shared';

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
  async loadLeaderboard() {
    return (await this.ctx.storage.get<LeaderboardMap>(STORAGE_LEADERBOARD_KEY)) ??
      new Map<string, LeaderboardItem>();
  }

  async saveLeaderboard(leaderboard: LeaderboardMap) {
    leaderboard = leaderboard ?? new Map<string, LeaderboardItem>();
    await this.ctx.storage.put<LeaderboardMap>(
      STORAGE_LEADERBOARD_KEY,
      leaderboard
    );
    this.broadcast(JSON.stringify({ type: PartyServerMessageTypes.LEADERBOARD_UPDATED, data: await this.getRankedLeaderboard() }));
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
      return this.onGetScore(req);
    }

    if (url.pathname.endsWith('/score') && req.method === 'POST') {
      return this.onPostScore(req);
    }

    if (req.method === 'GET') {
      return this.onGetPublicLeaderboard();
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

  // Used to the current player's score,
  // returns the player's rank, name, uid, and score
  // or null if not found
  // does not include the secret field
  private async onGetScore(req: Request) {
    // Later enforce authentication?

    const query = new URL(req.url).searchParams;
    const playerId = query.get('playerId');
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: Missing playerId' }),
        { status: 400, headers: HEADERS }
      );
    }

    const leaderboard = await this.getRankedLeaderboard();
    const playerEntry = leaderboard.find((entry) => entry.uid === playerId);

    return new Response(JSON.stringify(playerEntry ?? null), {
      status: 200,
      headers: HEADERS
    });
  }

  private async onPostScore(req: Request) {
    const payload: LeaderboardPostBody = await req.json();
    const { type, uid, name } = payload;

    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: HEADERS
      });
    }

    const leaderboard = await this.loadLeaderboard();
    let entry = leaderboard.get(uid);
    if (!entry) {
      entry = {
        uid,
        name,
        secret,
        score: 0
      };
      leaderboard.set(uid, entry);
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

    await this.saveLeaderboard(leaderboard);
    return new Response('OK', {
      headers: HEADERS
    });
  }

  private async onGetPublicLeaderboard() {
    return new Response(JSON.stringify(await this.getPublicLeaderboard()), {
      status: 200,
      headers: HEADERS
    });
  }

  private async getPublicLeaderboard(): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getRankedLeaderboard();
    return leaderboard.slice(0, 10);
  }


  // Returns the full leaderboard sorted by score descending
  // with ranks assigned
  // without the secret field
  private async getRankedLeaderboard(): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.loadLeaderboard();
    return Array.from(leaderboard.values())
      .sort((a, b) => b.score - a.score)
      .map(({ name, uid, score }, index) => ({
        rank: index + 1,
        name,
        uid,
        score
      }));
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
