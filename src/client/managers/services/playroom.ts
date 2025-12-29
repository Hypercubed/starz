import {
  getState,
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  Bot as PRBot,
  RPC,
  setState,
  waitForState
} from 'playroomkit';
import { Bot } from '../../game/bots';
import type { PlayroomGameManager } from '../playroom';
import { worldToJson } from '../../game/world';
import type { GameStatus, WorldJSON } from '../types';
import type { Player, PlayerStats } from '../../types';
import type { Move, Order } from '../../game/types';
import { EventBus } from '../../classes/event-bus';

const PLAYROOM_STATES = {
  GAME_STATUS: 'GAME_STATUS',
  WORLD: 'WORLD',
  TICK: 'TICK',
  PLAYERS: 'PLAYERS',
  PLAYER_STATS: 'PLAYER_STATS'
} as const;

const PLAYER_STATES = {
  PLAYER: 'PLAYER'
} as const;

const PLAYROOM_EVENTS = {
  GAME_STARTED: 'GAME_STARTED',
  ORDER_GIVEN: 'ORDER_GIVEN',
  UPDATE_SYSTEM: 'UPDATE_SYSTEM',
  PLAYER_ELIMINATED: 'PLAYER_ELIMINATED'
} as const;

type PlayerEliminatedEventData = {
  loserId: string;
  winnerId: string;
};

class PlayroomBot extends PRBot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);
    this.gameBot = new Bot({ id: this.id });
  }
}

const createEvents = () => {
  return {
    // ORDER_TAKEN: createEvent<Order>(),
    // MOVE_MADE: createEvent<Move>(),
    // PLAYER_ELIMINATED: createEvent<{ loserId: string; winnerId: string | null }>(),
  } as const;
};

type EventsMap = ReturnType<typeof createEvents>;

export class PlayroomService extends EventBus<EventsMap> {
  manager: PlayroomGameManager;

  constructor(manager: PlayroomGameManager) {
    super(createEvents());
    this.manager = manager;
  }

  async connect() {
    this.#registerPlayroomEvents();

    await insertCoin({
      // skipLobby: true,
      gameId: 'etTt5RuPbZxwWPXQvYzF',
      persistentMode: true,
      enableBots: true,
      reconnectGracePeriod: 30000,
      botOptions: {
        botClass: PlayroomBot
      },
      maxPlayersPerRoom: 5,
      defaultStates: {
        [PLAYROOM_STATES.GAME_STATUS]: 'WAITING'
      }
    });
  }

  setSetupState() {
    const state = this.manager.getState();

    setState(PLAYROOM_STATES.WORLD, worldToJson(state.world), true);
    setState(PLAYROOM_STATES.PLAYERS, playersToJson(state.playerMap), true);
  }

  async getSetupState() {
    const world = await waitForState<WorldJSON>(PLAYROOM_STATES.WORLD);
    const players = await waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);
    const status = await waitForState<GameStatus>(PLAYROOM_STATES.GAME_STATUS);
    return { world, players, status };
  }

  waitForStatus() {
    return waitForState<GameStatus>(PLAYROOM_STATES.GAME_STATUS);
  }

  sendStateToPlayroom() {
    const state = this.manager.getState();
    const { tick, status } = this.manager.getContext();

    myPlayer().setState(PLAYER_STATES.PLAYER, state.playerMap, false);

    if (isHost()) {
      setState(PLAYROOM_STATES.TICK, tick, false);
      setState(
        PLAYROOM_STATES.PLAYER_STATS,
        Array.from(state.playerMap.values()).map((p) => p.stats),
        false
      );
      setState(PLAYROOM_STATES.GAME_STATUS, status, false);

      setState(PLAYROOM_STATES.WORLD, worldToJson(state.world), false);
      setState(PLAYROOM_STATES.PLAYERS, playersToJson(state.playerMap), false);
    }
  }

  getStateFromPlayroom() {
    if (!isHost()) {
      const state = this.manager.getState();

      const tick = getState(PLAYROOM_STATES.TICK) as number;
      const status = getState(PLAYROOM_STATES.GAME_STATUS) as GameStatus;
      this.manager.setContext({ tick, status });

      const world = getState(PLAYROOM_STATES.WORLD) as WorldJSON;
      if (world) {
        state.world.systemMap = new Map(world.systems);
        state.world.laneMap = new Map(world.lanes);
      }

      const playerStats = getState(
        PLAYROOM_STATES.PLAYER_STATS
      ) as PlayerStats[];

      if (playerStats) {
        for (const p of state.playerMap.values()) {
          const stats = playerStats.find((s) => s.playerId === p.id);
          if (stats) p.stats = stats;
        }
      }
    }
  }

  sendOrder(order: Order) {
    if (!isHost()) {
      RPC.call(PLAYROOM_EVENTS.ORDER_GIVEN, order, RPC.Mode.HOST);
    }
  }

  sendMove(move: Move) {
    if (isHost()) {
      this.sendStateToPlayroom(); // TODO: Send partial updates only
      RPC.call(PLAYROOM_EVENTS.UPDATE_SYSTEM, move, RPC.Mode.OTHERS);
    }
  }

  sendPlayerEliminated(loserId: string, winnerId: string | null) {
    if (isHost()) {
      RPC.call(
        PLAYROOM_EVENTS.PLAYER_ELIMINATED,
        {
          loserId,
          winnerId
        },
        RPC.Mode.OTHERS
      );
    }
  }

  #registerPlayroomEvents() {
    console.log('Registering Playroom events.');

    RPC.register(PLAYROOM_EVENTS.UPDATE_SYSTEM, async () => {
      this.getStateFromPlayroom();
      const state = this.manager.getState();
      const { status } = this.manager.getContext();

      this.manager.emit('STATE_UPDATED', {
        state: state,
        status: status
      });
    });

    RPC.register(PLAYROOM_EVENTS.ORDER_GIVEN, async (order: Order) => {
      this.manager.emit('TAKE_ORDER', order);
    });

    RPC.register(
      PLAYROOM_EVENTS.PLAYER_ELIMINATED,
      async ({ loserId, winnerId }: PlayerEliminatedEventData) => {
        this.manager.emit('PLAYER_ELIMINATED', {
          loserId: loserId,
          winnerId: winnerId
        });
      }
    );

    onPlayerJoin((playerState) => this.manager.playerJoin(playerState));
  }
}

function playersToJson(playerMap: Map<string, Player>) {
  return Array.from(playerMap.values()).map(playerToJson);
}

function playerToJson(player: Player) {
  return {
    ...player,
    bot: undefined,
    visitedSystems: player.visitedSystems,
    revealedSystems: player.revealedSystems
  };
}
