import * as PR from 'playroomkit';

import { COLORS } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as game from '../game/index.ts';
import * as renderer from '../ui/index.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player, PlayerStats } from '../types.ts';
import type { WorldJSON } from './types';
import type { Move, Order, System, World } from '../game/types';

class PlayroomBot extends PR.Bot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);
    this.gameBot = new Bot({ id: this.id });
  }
}

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

export class PlayroomGameManager extends GameManager {
  private playerStates = new Map<string, PR.PlayerState>();

  constructor() {
    super();
    this.registerUIEvents();
  }

  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    this.registerPlayroomEvents();

    const ctx = this.getContext();
    this.state = this.game.setup(ctx);
    PR.resetStates();
    renderer.clearMessages();

    await PR.insertCoin({
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

    console.log('Connected to Playroom.');
    console.log('Player ID:', PR.myPlayer().id);
    console.log('Is Host:', PR.isHost());

    // For some reason sometimes host is not added
    if (!this.state.playerMap.has(PR.myPlayer().id)) {
      this.addPlayerProfile(PR.myPlayer());
    }

    if (PR.isHost()) {
      game.generateMap(this.getContext());

      for (const player of this.state.playerMap.values()) {
        game.assignSystem(this.state, player.id);
      }

      console.log('Generated world and players as host.');

      PR.setState(PLAYROOM_STATES.WORLD, worldToJson(this.state.world), true);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.playerMap),
        true
      );
    } else {
      const world = await PR.waitForState<WorldJSON>(PLAYROOM_STATES.WORLD);
      const players = await PR.waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);

      console.log('Received world and players from host.', { world, players });

      this.state.world = worldFromJson(world);

      for (const player of players) {
        this.addPlayer(player.name, player.id, undefined, player.color);
      }
    }

    console.log(
      'Restoring player state from Playroom state.',
      PR.myPlayer().id
    );
    this.setupThisPlayer(PR.myPlayer().id);

    // const playerJson = PR.myPlayer().getState(PLAYER_STATES.PLAYER) as any;
    // if (playerJson) {
    //   const p = playerFromJson(playerJson);
    //   const localPlayer = state.playerMap.get(state.thisPlayerId!)!;
    //   console.log('Restoring local player state from Playroom state.', p, localPlayer);
    //   Object.assign(localPlayer, p);
    // }

    renderer.setupUI();

    // Adjust colors as needed
    const colorsAvailable = new Set<string>(COLORS);
    const colorsUsed = new Set<string>();

    for (const player of this.state.playerMap.values()) {
      if (colorsUsed.has(player.color)) {
        player.color =
          colorsAvailable.values().next().value || getRandomColor();
      }

      colorsAvailable.delete(player.color);
      colorsUsed.add(player.color);
    }

    this.gameStart();
    renderer.rerender();
  }

  protected setupThisPlayer(playerId: string) {
    this.playerId = playerId;
    const homeworld = game.getPlayersHomeworld(this.state)!;
    game.visitSystem(this.state, homeworld);
    renderer.centerOnHome();
    renderer.clearSelection();
    renderer.select(homeworld.id);
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    super.gameStart();

    renderer.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId!);
    if (player) {
      renderer.addMessage(`You are Player ${player.name}.`);
    }
  }

  public gameTick() {
    this.tick++;

    this.game.gameTick(this.getContext(), !PR.isHost());

    this.sendStateToPlayroom();
    this.getStateFromPlayroom();

    this.game.checkVictory(this.getContext());

    this.events.emit('STATE_UPDATED', {
      state: this.state,
      status: this.status
    });
  }

  private sendStateToPlayroom() {
    PR.myPlayer().setState(PLAYER_STATES.PLAYER, this.state.playerMap, false);

    if (PR.isHost()) {
      PR.setState(PLAYROOM_STATES.TICK, this.tick, false);
      PR.setState(
        PLAYROOM_STATES.PLAYER_STATS,
        Array.from(this.state.playerMap.values()).map((p) => p.stats),
        false
      );
      PR.setState(PLAYROOM_STATES.GAME_STATUS, this.status, false);

      PR.setState(PLAYROOM_STATES.WORLD, worldToJson(this.state.world), false);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.playerMap),
        false
      );
    }
  }

  private getStateFromPlayroom() {
    if (!PR.isHost()) {
      this.tick = PR.getState(PLAYROOM_STATES.TICK) as number;
      // this.gameState = PR.getState(PLAYROOM_STATES.GAME_STATE) as GameState;

      // if (this.tick % 10 === 0) {
      const world = PR.getState(PLAYROOM_STATES.WORLD) as WorldJSON;
      if (world) {
        this.state.world.systemMap = new Map(world.systems);
        this.state.world.laneMap = new Map(world.lanes);
      }
      // }

      const playerStats = PR.getState(
        PLAYROOM_STATES.PLAYER_STATS
      ) as PlayerStats[];
      if (playerStats) {
        for (const p of this.state.playerMap.values()) {
          const stats = playerStats.find((s) => s.playerId === p.id);
          if (stats) p.stats = stats;
        }
      }
    }
  }

  private playerJoin(playerState: PR.PlayerState) {
    console.log(`Player joined: ${playerState.id}`);
    this.playerStates.set(playerState.id, playerState);

    if (PR.isHost()) {
      this.addPlayerProfile(playerState);
    }

    playerState.onQuit(() => {
      console.log(`Player quit: ${playerState.id}`);
      this.playerStates.delete(playerState.id);
    });
  }

  protected addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ) {
    const player = super.addPlayer(name, playerId, bot, color);
    if (!player) return;

    document.documentElement.style.setProperty(`--player-${player.id}`, color);
    return player;
  }

  private addPlayerProfile(playerState: PR.PlayerState) {
    if (this.state.playerMap.has(playerState.id)) return;

    const profile = playerState.getProfile();
    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const color = profile.color?.hexString ?? COLORS[this.state.playerMap.size];
    this.addPlayer(profile.name || playerState.id, playerState.id, bot, color);
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    if (PR.isHost()) {
      const loser = this.state.playerMap.get(loserId)!;
      const winner = this.state.playerMap.get(winnerId as any);

      const message =
        winnerId === null
          ? `${loser.name} has been eliminated!`
          : `${winner!.name} has eliminated ${loser.name}!`;

      renderer.addMessage(message);

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world, false);

      PR.RPC.call(
        PLAYROOM_EVENTS.PLAYER_ELIMINATED,
        { loserId, winnerId },
        PR.RPC.Mode.OTHERS
      );
    }
  }

  private onSystemUpdated(system: System) {
    const from = this.state.world.systemMap.get(system.id)!;
    Object.assign(from, system);

    if (from.ownerId === this.playerId) {
      game.visitSystem(this.state, from);
    } else {
      renderer.deselect(from.id);
    }

    // TODO: Also set data for animation
  }

  private registerPlayroomEvents() {
    PR.RPC.register(PLAYROOM_EVENTS.UPDATE_SYSTEM, async (system: System) => {
      this.onSystemUpdated(system);

      this.events.emit('STATE_UPDATED', {
        state: this.state,
        status: this.status
      });
    });

    PR.RPC.register(PLAYROOM_EVENTS.ORDER_GIVEN, async (order: Order) => {
      this.game.takeOrder(this.getContext(), order);
    });

    PR.RPC.register(
      PLAYROOM_EVENTS.PLAYER_ELIMINATED,
      async (data: PlayerEliminatedEventData) => {
        this.onEliminatePlayer(data.loserId, data.winnerId);
        const world = PR.getState(PLAYROOM_STATES.WORLD) as WorldJSON;
        if (world) {
          this.state.world = worldFromJson(world);
        }

        this.events.emit('STATE_UPDATED', {
          state: this.state,
          status: this.status
        });
      }
    );

    PR.onPlayerJoin((playerState) => this.playerJoin(playerState));
  }

  public async onQuit() {
    const restart = await renderer.showEndGame('Quit?');
    if (!restart) return false;
    this.reload();
    return true;
  }

  protected async onPlayerWin(winnerId: string, message?: string) {
    console.log('onPlayerWin', { winnerId, message }, this.playerId);
    if (message) {
      renderer.addMessage(message);
    }

    this.game.revealAllSystems(this.state);
    renderer.clearSelection();

    if (winnerId === this.playerId) {
      trackEvent('starz_gamesWon');
      await renderer.showEndGame(`You have conquered The Bubble!`);
    } else {
      trackEvent('starz_gamesLost', { winnerId });
      await renderer.showEndGame(`You have lost your homeworld! Game Over.`);
    }
    this.reload();
  }

  private reload() {
    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
  }

  private onTakeOrder(order: Order) {
    // Send order to host
    if (!PR.isHost()) {
      PR.RPC.call(PLAYROOM_EVENTS.ORDER_GIVEN, order, PR.RPC.Mode.HOST);
    }
  }

  private onMakeMove(move: Move) {
    // Notify other players of the updated systems.
    if (PR.isHost()) {
      PR.RPC.call(
        PLAYROOM_EVENTS.UPDATE_SYSTEM,
        this.state.world.systemMap.get(move.fromId),
        PR.RPC.Mode.OTHERS
      );

      PR.RPC.call(
        PLAYROOM_EVENTS.UPDATE_SYSTEM,
        this.state.world.systemMap.get(move.toId),
        PR.RPC.Mode.OTHERS
      );

      // TODO: Also send lane
    }

    this.sendStateToPlayroom();
  }

  private registerUIEvents() {
    renderer.setupDialogs();
    renderer.setupKeboardControls();

    this.events.on('PLAYER_WIN', ({ playerId, message }) => {
      this.onPlayerWin(playerId, message);
    });

    this.events.on('TAKE_ORDER', (order: Order) => {
      this.onTakeOrder(order);
    });

    this.events.on('MAKE_MOVE', (move: Move) => {
      this.onMakeMove(move);
    });
  }
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
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

// function playerFromJson(player: any) {
//   return {
//     ...player,
//     visitedSystems: [],
//     revealedSystems: []
//   }
// }

export function worldFromJson(json: WorldJSON): World {
  console.log('Loading world from JSON...', json);

  const world = game.createWorld();

  world.systemMap = new Map(json.systems);
  world.laneMap = new Map(json.lanes);
  game.buildNeighborMap(world);
  return world;
}

export function worldToJson(world: World): WorldJSON {
  return {
    systems: Array.from(world.systemMap.entries()),
    lanes: Array.from(world.laneMap.entries())
  };
}
