import { routePartykitRequest, Server } from 'partyserver';
import { pack } from 'msgpackr';

import type { LeaderboardEntry, LeaderboardPostBody } from './types';
import type { Connection } from 'partyserver';
import { PartyServerMessageTypes } from './shared';

type LeaderboardItem = Omit<LeaderboardEntry, 'rank'> & { secret: string };
type LeaderboardMap = Map<string, LeaderboardItem>;

export interface Env {
  SECRET_KEY: string; // Example secret
}

const STORAGE_LEADERBOARD_KEY = 'starz-game-room-leaderboard';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Define your Server
export class LobbyServer extends Server<Env> {
  private _leaderboardCache: LeaderboardMap | null = null;

  async getLeaderboard() {
    if (!this._leaderboardCache) {
      this._leaderboardCache = (await this.ctx.storage.get<LeaderboardMap>(STORAGE_LEADERBOARD_KEY)) ??
        new Map<string, LeaderboardItem>();
    }
    return this._leaderboardCache;
  }

  async saveLeaderboard() {
    if (!this._leaderboardCache) return;
    const leaderboard = await this.getLeaderboard();
    await this.ctx.storage.put<LeaderboardMap>(
      STORAGE_LEADERBOARD_KEY,
      leaderboard
    );

    const broadcastData = { type: PartyServerMessageTypes.LEADERBOARD_UPDATED, data: await this.getPublicLeaderboard() };
    this.broadcast(pack(broadcastData));
  }

  onConnect(connection: Connection) {
    console.log('Connected', connection.id, 'to server', this.name);
  }

  onMessage(connection: Connection, message: string) {
    console.log('Message from', connection.id, ':', message);
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

    if (url.pathname.endsWith('/admin') && req.method === 'GET') {
      return this.onGetAdmin(req);
    }

    if (url.pathname.endsWith('/admin') && req.method === 'DELETE') {
      return this.onDeleteAdmin(req);
    }

    if (url.pathname.endsWith('/score') && req.method === 'GET') {
      return this.onGetScore(req);
    }

    if (url.pathname.endsWith('/score') && req.method === 'POST') {
      return this.onPostScore(req);
    }

    if (url.pathname.endsWith('/score') && req.method === 'DELETE') {
      return this.onDeleteScore(req);
    }

    if (req.method === 'GET') {
      return this.onGetPublicLeaderboard();
    }

    return new Response(
      JSON.stringify({ message: 'Hello from LobbyServer!' }),
      {
        status: 200,
        headers: HEADERS
      }
    );
  }

  // Used to the current player's score,
  // returns the player's rank, name, uid, and score
  // or null if not found
  // does not include the secret field
  async onGetScore(req: Request) {
    // Later enforce authentication?

    const query = new URL(req.url).searchParams;
    const playerId = query.get('playerId');
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: Missing playerId' }),
        { status: 400, headers: HEADERS }
      );
    }

    const playerEntry = await this.getPlayerEntry(playerId);
    return new Response(JSON.stringify(playerEntry ?? null), {
      status: 200,
      headers: HEADERS
    });
  }

  private async getPlayerEntry(playerId: string) {
    const leaderboard = await this.getRankedLeaderboard();
    const playerIndex = leaderboard.findIndex((entry) => entry.uid === playerId);
    return playerIndex !== -1 ? {
      ...leaderboard[playerIndex],
      rank: playerIndex + 1,
      secret: undefined
    } : null;
  }

  async onPostScore(req: Request) {
    const payload: LeaderboardPostBody = await req.json();
    const { type, uid, name } = payload;

    // Simple auth using a secret token in the Authorization header
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: HEADERS
      });
    }

    const leaderboard = await this.getLeaderboard();
    let entry = leaderboard.get(uid);
    if (!entry) {
      entry = {
        uid,
        name,
        secret,
        score: 0
      };
    } else if (entry.secret !== secret) {
      console.log('Unauthorized score update attempt for uid:', uid);
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
    leaderboard.set(uid, entry);
    await this.saveLeaderboard();

    const playerEntry = await this.getPlayerEntry(uid);
    return new Response(JSON.stringify(playerEntry ?? null), {
      headers: HEADERS
    });
  }

  async onDeleteScore(req: Request) {
    const query = new URL(req.url).searchParams;
    const playerId = query.get('playerId');
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: Missing playerId' }),
        { status: 400, headers: HEADERS }
      );
    }

    // Simple auth using a secret token in the Authorization header
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized, Missing token' }), {
        status: 401,
        headers: HEADERS
      });
    }

    const leaderboard = await this.getLeaderboard();
    const entry = leaderboard.get(playerId);
    if (!entry) {
      return new Response('Error', { status: 400 });
    }

    if (entry.secret !== secret && secret !== this.env.SECRET_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    leaderboard.delete(playerId);
    await this.saveLeaderboard();
    return new Response('OK', {
      headers: HEADERS
    });
  }

  async onGetPublicLeaderboard() {
    return new Response(JSON.stringify(await this.getPublicLeaderboard()), {
      status: 200,
      headers: HEADERS
    });
  }

  async onGetAdmin(req: Request) {
    // Simple auth using a secret token in the Authorization header
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret || secret !== this.env.SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: HEADERS
      });
    }

    const leaderboard = await this.getLeaderboard();
    return new Response(JSON.stringify(Array.from(leaderboard.values())), {
      status: 200,
      headers: HEADERS
    });
  }

  async onDeleteAdmin(req: Request) {
    // Simple auth using a secret token in the Authorization header
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!secret || secret !== this.env.SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: HEADERS
      });
    }

    this._leaderboardCache = new Map<string, LeaderboardItem>();
    await this.saveLeaderboard();
    return new Response('OK', {
      headers: HEADERS
    });
  }

  async getPublicLeaderboard(): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getRankedLeaderboard();
    return leaderboard.slice(0, 10).map((entry, index) => ({
      ...entry,
      secret: undefined,
      rank: index + 1
    }));
  }

  // Returns the full leaderboard sorted by score descending
  // with ranks assigned
  // without the secret field
  async getRankedLeaderboard(): Promise<LeaderboardItem[]> {
    const leaderboard = await this.getLeaderboard();
    return Array.from(leaderboard.values())
      .sort((a, b) => b.score - a.score);
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
