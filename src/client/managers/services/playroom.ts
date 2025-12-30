import {
  addBot,
  getRoomCode,
  getState,
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  Bot,
  RPC,
  setState,
  waitForState,
  type PlayerState
} from 'playroomkit';

import type { PlayroomGameManager } from '../playroom';
import { worldToJson } from '../../game/world';
import type { GameStatus, WorldJSON } from '../types';
import type { Player, PlayerStats } from '../../types';
import type { Move, Order } from '../../game/types';
import { createRoomCode } from '../../utils/ids';
import { eliminatePlayer } from '../../game';

const STATES = {
  GAME_STATUS: 'GAME_STATUS',
  WORLD: 'WORLD',
  TICK: 'TICK',
  PLAYERS: 'PLAYERS',
  PLAYER_STATS: 'PLAYER_STATS'
} as const;

const PLAYER_STATES = {
  PLAYER: 'PLAYER'
} as const;

const RPC_EVENTS = {
  GAME_STARTED: 'GAME_STARTED',
  PROCESS_ORDER: 'PROCESS_ORDER',
  STATE_UPDATED: 'STATE_UPDATED',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_ELIMINATED: 'PLAYER_ELIMINATED',
  PLAYER__LEFT: 'PLAYER__LEFT'
} as const;

type PlayerEliminatedEventData = {
  loserId: string;
  winnerId: string;
};

export class PlayroomService {
  roomCode: string | null = null;

  private manager: PlayroomGameManager;

  // Map of playroom ID to PlayerState
  private playroomPlayerIds = new Set<string>();

  constructor(manager: PlayroomGameManager) {
    this.manager = manager;
  }

  async connect(roomCode?: string) {
    this.#registerPlayroomEvents();

    roomCode ??= createRoomCode();

    await insertCoin({
      skipLobby: true,
      roomCode,
      gameId: 'etTt5RuPbZxwWPXQvYzF',
      persistentMode: true,
      enableBots: true,
      reconnectGracePeriod: 30000,
      botOptions: {
        botClass: Bot
      },
      maxPlayersPerRoom: 5,
      defaultStates: {
        [STATES.GAME_STATUS]: 'WAITING'
      }
    });

    console.log('Connected to Playroom.');
    console.log('Player ID:', myPlayer().id);
    console.log('Is Host:', isHost());

    const player = this.manager.getPlayer()!;
    myPlayer().setState(PLAYER_STATES.PLAYER, player);

    if (isHost()) {
      const state = this.manager.getState();
      setState(STATES.PLAYERS, playersToJson(state.playerMap), true);
    }

    roomCode = getRoomCode()!;
    this.manager.emit('ROOM_CREATED', {
      roomId: 'R' + roomCode,
      isHost: isHost()
    });
    this.roomCode = roomCode;

    // Add existing players
    const players = await waitForState<Player[]>(STATES.PLAYERS);
    players.forEach((p) => this.manager.onPlayerJoin(p));
  }

  sendSetupState() {
    const state = this.manager.getState();
    setState(STATES.WORLD, worldToJson(state.world), true);
    setState(STATES.PLAYERS, playersToJson(state.playerMap), true);
  }

  async getSetupState() {
    const world = await waitForState<WorldJSON>(STATES.WORLD);
    const players = await waitForState<Player[]>(STATES.PLAYERS);
    const status = await waitForState<GameStatus>(STATES.GAME_STATUS);
    return { world, players, status };
  }

  waitForStatus() {
    return waitForState<GameStatus>(STATES.GAME_STATUS);
  }

  sendStateToPlayroom() {
    const state = this.manager.getState();
    const { tick, status, playerId } = this.manager.getContext();

    const thisPlayer = state.playerMap.get(playerId);
    myPlayer().setState(PLAYER_STATES.PLAYER, thisPlayer, false);

    if (isHost()) {
      setState(STATES.TICK, tick, false);
      setState(
        STATES.PLAYER_STATS,
        Array.from(state.playerMap.values()).map((p) => p.stats),
        false
      );
      setState(STATES.GAME_STATUS, status, false);

      setState(STATES.WORLD, worldToJson(state.world), false);
      setState(STATES.PLAYERS, playersToJson(state.playerMap), false);
    }
  }

  getStateFromPlayroom() {
    if (!isHost()) {
      const state = this.manager.getState();

      const tick = getState(STATES.TICK) as number;
      const status = getState(STATES.GAME_STATUS) as GameStatus;
      this.manager.setContext({ tick, status });

      const world = getState(STATES.WORLD) as WorldJSON;
      if (world) {
        state.world.systemMap = new Map(world.systems);
        state.world.laneMap = new Map(world.lanes);
      }

      const playerStats = getState(STATES.PLAYER_STATS) as PlayerStats[];

      if (playerStats) {
        for (const p of state.playerMap.values()) {
          const stats = playerStats.find((s) => s.playerId === p.id);
          if (stats) p.stats = stats;
        }
      }
    }
  }

  onOrder(order: Order) {
    if (!isHost()) {
      RPC.call(RPC_EVENTS.PROCESS_ORDER, order, RPC.Mode.HOST);
    }
  }

  onMove(move: Move) {
    if (isHost()) {
      this.sendStateToPlayroom(); // TODO: Send partial updates only
      RPC.call(RPC_EVENTS.STATE_UPDATED, move, RPC.Mode.OTHERS);
    }
  }

  sendPlayerEliminated(loserId: string, winnerId?: string) {
    if (isHost() || loserId === this.manager.getPlayer()!.id) {
      RPC.call(
        RPC_EVENTS.PLAYER_ELIMINATED,
        {
          loserId,
          winnerId
        },
        RPC.Mode.OTHERS
      );
    }
  }

  onGameStarted() {
    if (isHost()) {
      RPC.call(RPC_EVENTS.GAME_STARTED, {}, RPC.Mode.OTHERS);
    }
  }

  async addBot(player: Partial<Player>) {
    const bot = await addBot();
    console.log('Playroom bot added:', bot);
    bot.setState(PLAYER_STATES.PLAYER, player);
    RPC.call(RPC_EVENTS.PLAYER_JOINED, { player }, RPC.Mode.OTHERS);
  }

  async onPlayerJoin(playerState: PlayerState) {
    if (this.playroomPlayerIds.has(playerState.id)) return;
    this.playroomPlayerIds.add(playerState.id);

    // Handle player joining late

    playerState.onQuit(() => {
      console.log('Playroom player left:', playerState.id);
      const player = playerState.getState(PLAYER_STATES.PLAYER) as Player;
      RPC.call(RPC_EVENTS.PLAYER__LEFT, { player }, RPC.Mode.OTHERS);
      this.playroomPlayerIds.delete(playerState.id);
      this.manager.emit('PLAYER_ELIMINATED', {
        loserId: player.id,
        winnerId: null
      });
    });

    // If this is me, set my player state, let others know
    if (playerState.id === myPlayer().id) {
      const player = this.manager.getPlayer()!;
      console.log('Setting up my player state.', playerState.id, player);
      playerState.setState(PLAYER_STATES.PLAYER, player);
      RPC.call(RPC_EVENTS.PLAYER_JOINED, { player }, RPC.Mode.OTHERS);

      // Add existing players
      const players = await waitForState<Player[]>(STATES.PLAYERS);
      players.forEach((p) => this.manager.onPlayerJoin(p));
    }
  }

  #registerPlayroomEvents() {
    console.log('Registering Playroom events.');

    RPC.register(RPC_EVENTS.GAME_STARTED, async () => {
      this.manager.start();
    });

    RPC.register(RPC_EVENTS.STATE_UPDATED, async () => {
      if (!isHost()) {
        this.getStateFromPlayroom();
        this.manager.emit('STATE_UPDATED');
      }
    });

    RPC.register(RPC_EVENTS.PROCESS_ORDER, async (order: Order) => {
      this.manager.emit('PROCESS_ORDER', order);
    });

    RPC.register(
      RPC_EVENTS.PLAYER_ELIMINATED,
      async ({ loserId, winnerId }: PlayerEliminatedEventData) => {
        const ctx = this.manager.getFnContext();
        eliminatePlayer(ctx, loserId, winnerId);
      }
    );

    RPC.register(RPC_EVENTS.PLAYER_JOINED, async ({ player }) => {
      console.log('Playroom PLAYER_JOINED event:', player);
      this.manager.onPlayerJoin(player);
    });

    RPC.register(RPC_EVENTS.PLAYER__LEFT, async ({ player }) => {
      console.log('Playroom PLAYER__LEFT event:', player);
      this.manager.onPlayerLeave(player);
    });

    onPlayerJoin((playerState: PlayerState) => this.onPlayerJoin(playerState));
  }
}

function playersToJson(playerMap: Map<string, Player>) {
  return Array.from(playerMap.values()).map(playerToJson);
}

function playerToJson(player: Player) {
  return {
    ...player,
    bot: undefined, // TODO: Move bot data separately
    visitedSystems: player.visitedSystems,
    revealedSystems: player.revealedSystems
  };
}
