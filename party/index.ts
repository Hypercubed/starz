import type * as Party from "partykit/server";
import type { LeaderboardEntry, LeaderboardPostBody } from "./types.d.ts";

type LeaderboardMap = Map<string, LeaderboardEntry>;

const STORAGE_LEADERBOARD_KEY = "starz-game-room-leaderboard";

export default class Server implements Party.Server {
  private leaderboard!: LeaderboardMap;

  constructor(readonly room: Party.Room) {
  }

  async onStart() {
    const leaderboard = await this.room.storage.get<LeaderboardMap>(STORAGE_LEADERBOARD_KEY);
    this.leaderboard = leaderboard ?? new Map<string, LeaderboardEntry>();
  }

  async saveLeaderboard() {
    if (this.leaderboard) {
      await this.room.storage.put<LeaderboardMap>(STORAGE_LEADERBOARD_KEY, this.leaderboard ?? new Map<string, LeaderboardEntry>());
    }
  }

  private getPublicLeaderboard() {
    // Return leaderboard WITHOUT playerToken
    return Array.from(this.leaderboard.values())
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        name: player.playerName,
        id: player.playerId,
        score: player.score
      })).slice(0, 20);
  }

  private getPlayerScore(playerId: string, playerToken: string): LeaderboardEntry | null {
    const playerEntry = this.leaderboard.get(playerId);
    if (!playerEntry) return null;

    if (playerEntry.playerToken !== playerToken) {
      return null;
    }
    
    return playerEntry;
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const playerId = url.searchParams.get('playerId')!;
    const playerToken = url.searchParams.get('playerToken')!;
    const playerName = url.searchParams.get('playerName')!;

    const playerEntry = this.leaderboard.get(playerId);

    if (playerEntry) {
      // if (playerEntry.playerToken !== playerToken) {
      //   console.log(`Unauthorized connection attempt: ${conn.id} (playerId: ${playerId})`);
      //   conn.close(4001, "Unauthorized: Invalid player token");
      //   return;
      // }

      // Update name on reconnect
      playerEntry.playerName = playerName;
    } else {
      this.leaderboard.set(playerId, {
        playerId,
        playerToken,
        playerName,
        score: 0
      });
    }

    this.onPlayerJoin(playerName, conn);

    conn.send(JSON.stringify({
      type: 'init',
      playerId: playerId,
      playerEntry: this.getPlayerScore(playerId!, playerToken!),
      leaderboard: this.getPublicLeaderboard(),
      roomId: this.room.id
    }));
  }

  onPlayerJoin(playerName: string, conn: Party.Connection) {
    const message = `${playerName} has joined the game!`;
    const body =  { type: 'player-joined', message: message };
    const json = JSON.stringify(body);
    this.room.broadcast(json, [conn.id]);
  }

  async onRequest(req: Party.Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(req.url);

    if (req.method === "GET") {  // Get leaderboard
      return new Response(JSON.stringify(this.getPublicLeaderboard()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (req.method === "POST") {  // Update player score
      const payload = await req.json<LeaderboardPostBody>();
      const { type, playerId, playerToken, playerName } = payload;

      let playerEntry = this.leaderboard.get(playerId);
      if (!playerEntry) {
        playerEntry = {
          playerId,
          playerToken,
          playerName,
          score: 0
        };
        this.leaderboard.set(playerId, playerEntry);
      } else if (playerEntry.playerToken !== playerToken) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (type === 'increment') {
        playerEntry.score += 1;
      } else if (type === 'decrement') {
        playerEntry.score = Math.max(0, playerEntry.score - 1);
      } else {
        return new Response("Bad Request: Invalid type", { status: 400 });
      }
      playerEntry.playerName = playerName; // Update name on score change

      await this.saveLeaderboard();
      return new Response("OK", {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response("Method not allowed", { status: 405 });
  }

  onMessage(message: string, sender: Party.Connection) {
    console.log(`Received message from ${sender.id}: ${message}`);

    // // send the message to all connected clients
    // for (const conn of this.room.getConnections()) {
    //   if (conn.id !== sender.id) {
    //     conn.send(`${sender.id} says: ${message}`);
    //   }
    // }
  }
}

Server satisfies Party.Worker;
