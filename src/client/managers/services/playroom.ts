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
  type PlayerState,
  waitForPlayerState
} from 'playroomkit';

import type { PlayroomGameManager } from '../playroom';
import { worldFromJson, worldToJson } from '../../game/world.ts';
import type { GameStatus, WorldJSON } from '../types.ts';
import type { Player } from '../../types.ts';
import type {
  GameConfig,
  GameState,
  Lane,
  Order,
  System
} from '../../game/types.ts';
import { createRoomCode } from '../../utils/ids.ts';
import { eliminatePlayer } from '../../game';
import { MAX_PLAYERS } from '../../constants.ts';

const STATES = {
  GAME_STATUS: 'GAME_STATUS',
  TICK: 'TICK',
  WORLD_SYSTEMS: 'WORLD_SYSTEMS',
  WORLD_LANES: 'WORLD_LANES',
  WORLD_SYSTEM_UPDATE: 'WORLD_SYSTEM_UPDATE',
  WORLD_LANE_UPDATE: 'WORLD_LANE_UPDATE',
  READY: 'READY'
} as const;

const PLAYER_STATES = {
  PLAYER: 'PLAYER'
} as const;

const RPC_EVENTS = {
  GAME_STARTED: 'GAME_STARTED',
  PROCESS_ORDER: 'PROCESS_ORDER',
  STATE_UPDATED: 'STATE_UPDATED',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_ELIMINATED: 'PLAYER_ELIMINATED'
} as const;

type PlayerEliminatedEventData = {
  loserId: string;
  winnerId?: string;
  timestamp: number;
};

type FastChanges = {
  tick?: number;
  status?: GameStatus;
  systems?: Partial<System>[];
  lanes?: Partial<Lane>[];
};

export class PlayroomService {
  roomCode: string | null = null;

  private manager: PlayroomGameManager;

  private participantIds = new Set<string>();
  private playerStateByPlayerId = new Map<string, PlayerState>();

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
      persistentMode: false,
      enableBots: true,
      reconnectGracePeriod: 0,
      botOptions: {
        botClass: Bot
      },
      maxPlayersPerRoom: MAX_PLAYERS,
      defaultStates: {
        [STATES.GAME_STATUS]: 'WAITING'
      }
    });

    console.log('Connected to Playroom.');
    console.log('Player ID:', myPlayer().id);
    console.log('Is Host:', isHost());

    roomCode = getRoomCode()!;
    this.manager.emit('ROOM_CREATED', {
      roomId: 'R' + roomCode,
      isHost: isHost()
    });
    this.roomCode = roomCode;
  }

  isHost() {
    return isHost() ?? true;
  }

  setFullState(state: GameState) {
    const { tick } = this.manager.getContext();

    console.log('Sending full state to Playroom players.');

    setState(STATES.TICK, tick, true);

    const worldJson = worldToJson(state.world);
    setState(STATES.WORLD_SYSTEMS, worldJson.systems, true);
    setState(STATES.WORLD_LANES, worldJson.lanes, true);

    setState(STATES.READY, true, true);
  }

  async getFullState() {
    if (isHost()) return;

    console.log('Fetching full state from Playroom host...');
    await waitForState(STATES.READY);

    console.log('Playroom host indicates full state is ready.');

    const tick = (getState(STATES.TICK) ??
      (await waitForState(STATES.TICK))) as number;

    const systems = (getState(STATES.WORLD_SYSTEMS) ??
      (await waitForState(STATES.WORLD_SYSTEMS))) as WorldJSON['systems'];
    const lanes = (getState(STATES.WORLD_LANES) ??
      (await waitForState(STATES.WORLD_LANES))) as WorldJSON['lanes'];

    console.log('Full state received from Playroom host.');

    const state = this.manager.getState();
    const _world = worldFromJson({ systems, lanes });
    state.world.systemMap = _world.systemMap;
    state.world.laneMap = _world.laneMap;

    this.manager.setContext({ tick });
  }

  private createFastState(): FastChanges {
    const state = this.manager.getState();
    const systemUpdates = Array.from(state.world.systemMap.values()).map(
      (system) => ({
        id: system.id,
        type: system.type,
        ships: system.ships,
        ownerId: system.ownerId,
        homeworld: system.homeworld,
        movement: system.movement
      })
    );

    const laneUpdates = Array.from(state.world.laneMap.values()).map(
      (lane) => ({
        id: lane.id,
        movement: lane.movement
      })
    );

    const { tick, status } = this.manager.getContext();
    return {
      tick,
      status,
      systems: systemUpdates,
      lanes: laneUpdates
    } satisfies FastChanges;
  }

  setFastState() {
    if (!isHost()) return;

    const { systems, lanes, tick, status } = this.createFastState();
    setState(STATES.TICK, tick, false);
    setState(STATES.GAME_STATUS, status, false);
    setState(STATES.WORLD_SYSTEM_UPDATE, systems, false);
    setState(STATES.WORLD_LANE_UPDATE, lanes, false);

    // Get rid of this later
    const state = this.manager.getState();
    this.playerStateByPlayerId.forEach((playerState, playerId) => {
      const player = state.playerMap.get(playerId);
      if (!player) return;

      playerState.setState(PLAYER_STATES.PLAYER, {
        ...player,
        id: player.id,
        stats: player.stats,
        isAlive: player.isAlive
      });
    });
  }

  private readFastState(fastState: FastChanges) {
    const { systems, lanes } = fastState;
    const state = this.manager.getState();

    systems?.forEach((s) => {
      const system = state.world.systemMap.get(s.id!);
      if (system) {
        Object.assign(system, s);
      }
    });

    lanes?.forEach((l) => {
      const lane = state.world.laneMap.get(l.id!);
      if (lane) {
        Object.assign(lane, l);
      }
    });

    const context = this.manager.getContext();
    const tick = fastState.tick ?? context.tick;
    const status = fastState.status ?? context.status;

    this.manager.setContext({ tick: tick, status });
  }

  getFastState() {
    // console.log('Fetching fast state from Playroom host...');

    const tick = getState(STATES.TICK) as number;
    const status = getState(STATES.GAME_STATUS) as GameStatus;
    const systems = getState(STATES.WORLD_SYSTEM_UPDATE) as Partial<System>[];
    const lanes = getState(STATES.WORLD_LANE_UPDATE) as Partial<Lane>[];

    this.readFastState({
      tick,
      status,
      systems,
      lanes
    });

    // Get rid of this later
    const state = this.manager.getState();
    this.playerStateByPlayerId.forEach((playerState, playerId) => {
      const player = state.playerMap.get(playerId);
      if (!player) return;

      const playerChanges = playerState.getState(
        PLAYER_STATES.PLAYER
      ) as Player;
      Object.assign(player, {
        stats: playerChanges.stats,
        isAlive: playerChanges.isAlive
      });
    });
  }

  waitForStatus() {
    return waitForState<GameStatus>(STATES.GAME_STATUS);
  }

  async sendOrder(order: Order) {
    // saveMyTurnData(order);
    if (!isHost()) {
      const changes = (await RPC.call(
        RPC_EVENTS.PROCESS_ORDER,
        order,
        RPC.Mode.HOST
      )) as FastChanges;
      this.readFastState(changes);
    }
  }

  sendPlayerEliminated(loserId: string, winnerId?: string) {
    if (isHost()) {
      RPC.call(
        RPC_EVENTS.PLAYER_ELIMINATED,
        {
          loserId,
          winnerId,
          timestamp: Date.now()
        } satisfies PlayerEliminatedEventData,
        RPC.Mode.OTHERS
      );

      const participant = this.playerStateByPlayerId.get(loserId);
      if (participant) {
        if (loserId === this.manager.getPlayer()?.id) {
          participant.leaveRoom();
        } else {
          participant.kick();
        }
      }
    }
  }

  onGameStarted() {
    if (isHost()) {
      const config = this.manager.getConfig();
      RPC.call(
        RPC_EVENTS.GAME_STARTED,
        { config, timestamp: Date.now() },
        RPC.Mode.OTHERS
      );
    }
  }

  async addBot(player: Partial<Player>) {
    const bot = await addBot();
    console.log('Playroom bot added:', bot);
    bot.setState(PLAYER_STATES.PLAYER, player);
    RPC.call(
      RPC_EVENTS.PLAYER_JOINED,
      { player, timestamp: Date.now() },
      RPC.Mode.OTHERS
    );
  }

  removePlayer(id: string) {
    console.log('Removing Playroom player:', id);
    const playerState = this.playerStateByPlayerId.get(id);
    if (playerState) {
      playerState.kick();
    }
  }

  async onPlayerJoin(playerState: PlayerState) {
    if (this.participantIds.has(playerState.id)) return;
    this.participantIds.add(playerState.id);

    // Handle player joining late

    playerState.onQuit(() => {
      console.log('Playroom player left:', playerState.id);
      const player = playerState.getState(PLAYER_STATES.PLAYER) as Player;
      this.participantIds.delete(playerState.id);
      if (!player) return;

      const { status } = this.manager.getContext();
      if (status === 'PLAYING') {
        this.manager.emit('PLAYER_ELIMINATED', {
          // TODO: Should be ELIMINATE_PLAYER command
          loserId: player.id,
          winnerId: null
        });
      } else {
        this.manager.onPlayerLeave(player.id);
      }
    });

    // If this is me, set my player state, let others know
    if (playerState.id === myPlayer().id) {
      const player = this.manager.getPlayer()!;
      playerState.setState(PLAYER_STATES.PLAYER, player);
      this.playerStateByPlayerId.set(player.id, playerState);
    } else {
      const player = await waitForPlayerState<Player>(
        playerState,
        PLAYER_STATES.PLAYER
      );
      this.manager.onPlayerJoin(player);
      this.playerStateByPlayerId.set(player.id, playerState);
    }
  }

  #registerPlayroomEvents() {
    console.log('Registering Playroom events.');

    const callsSeen = new Set<number>();

    RPC.register(
      RPC_EVENTS.GAME_STARTED,
      async ({
        config,
        timestamp
      }: {
        config: GameConfig;
        timestamp: number;
      }) => {
        if (callsSeen.has(timestamp)) return;
        callsSeen.add(timestamp);

        this.manager.start(config);
      }
    );

    RPC.register(RPC_EVENTS.PROCESS_ORDER, async (order: Order) => {
      if (!isHost()) return;
      if (callsSeen.has(order.timestamp)) return;
      callsSeen.add(order.timestamp);

      // TODO: Optimize by only sending impacted systems/lanes
      return this.createFastState();
    });

    RPC.register(
      RPC_EVENTS.PLAYER_ELIMINATED,
      async ({ loserId, winnerId, timestamp }: PlayerEliminatedEventData) => {
        if (callsSeen.has(timestamp)) return;
        callsSeen.add(timestamp);

        const ctx = this.manager.getFnContext();
        eliminatePlayer(ctx, loserId, winnerId);

        // TODO: Optimize by only sending impacted systems/lanes
        return this.createFastState();
      }
    );

    onPlayerJoin((playerState: PlayerState) => this.onPlayerJoin(playerState));
  }
}

// TODO: Make jsonToPlayer
// Move to state files
