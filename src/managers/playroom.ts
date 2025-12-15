import * as PR from 'playroomkit';

import { COLORS } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player, PlayerStats } from '../types.d.ts';
import type { GameStatus, WorldJSON } from './types.d.ts';
import type { Move, Order, System } from '../game/types.d.ts';

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
    ui.clearMessages();

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

    this.status = await PR.waitForState<GameStatus>(
      PLAYROOM_STATES.GAME_STATUS
    );

    console.log('Connected to Playroom.');
    console.log('Player ID:', PR.myPlayer().id);
    console.log('Is Host:', PR.isHost());

    // For some reason sometimes host is not added
    if (
      this.status === 'WAITING' &&
      !this.state.playerMap.has(PR.myPlayer().id)
    ) {
      await this.addPlayerProfile(PR.myPlayer());
    }

    if (PR.isHost()) {
      this.game.generateMap(this.getContext());

      for (const player of this.state.playerMap.values()) {
        this.game.assignSystem(this.state, player.id);
      }

      console.log('Generated world and players as host.');

      PR.setState(
        PLAYROOM_STATES.WORLD,
        this.game.worldToJson(this.state.world),
        true
      );
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.playerMap),
        true
      );
    } else {
      const world = await PR.waitForState<WorldJSON>(PLAYROOM_STATES.WORLD);
      const players = await PR.waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);
      this.status = await PR.waitForState<GameStatus>(
        PLAYROOM_STATES.GAME_STATUS
      );

      console.log('Received world and players from host.', { world, players });

      this.state.world = this.game.worldFromJson(world);

      for (const player of players) {
        this.addPlayer(player.name, player.id, undefined, player.color);
      }
    }

    if (this.state.playerMap.has(PR.myPlayer().id)) {
      console.log(
        'Restoring player state from Playroom state.',
        PR.myPlayer().id
      );
      this.setupThisPlayer(PR.myPlayer().id);
    } else {
      console.log('Spectating game as non-player.');
    }

    // const playerJson = PR.myPlayer().getState(PLAYER_STATES.PLAYER) as any;
    // if (playerJson) {
    //   const p = playerFromJson(playerJson);
    //   const localPlayer = state.playerMap.get(state.thisPlayerId!)!;
    //   console.log('Restoring local player state from Playroom state.', p, localPlayer);
    //   Object.assign(localPlayer, p);
    // }

    ui.setupUI();

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
    ui.rerender();
  }

  protected setupThisPlayer(playerId: string) {
    this.playerId = playerId;
    console.log('Setting up this player:', playerId, this.state.playerMap);
    if (!this.state.playerMap.has(playerId)) return;

    const homeworld = this.game.getPlayersHomeworld(this.state)!;
    this.game.visitSystem(this.state, homeworld);
    ui.centerOnHome();
    ui.clearSelection();
    ui.select(homeworld.id);
  }

  protected gameStart() {
    PR.setState(PLAYROOM_STATES.GAME_STATUS, 'PLAYING', true);

    trackEvent('starz_gamesStarted');
    super.gameStart();

    ui.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId!);
    if (player) {
      ui.addMessage(`You are Player ${player.name}.`);
    } else {
      ui.addMessage(`You are a Spectator.`);
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

      PR.setState(
        PLAYROOM_STATES.WORLD,
        this.game.worldToJson(this.state.world),
        false
      );
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
      this.status = PR.getState(PLAYROOM_STATES.GAME_STATUS) as GameStatus;

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

  private async playerJoin(playerState: PR.PlayerState) {
    if (this.status !== 'WAITING') {
      return;
    }

    console.log(`Player joined: ${playerState.id}`);

    this.playerStates.set(playerState.id, playerState);

    if (PR.isHost()) {
      await this.addPlayerProfile(playerState);
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

  private async addPlayerProfile(playerState: PR.PlayerState) {
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

      ui.addMessage(message);

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world, false);

      PR.RPC.call(
        PLAYROOM_EVENTS.PLAYER_ELIMINATED,
        { loserId, winnerId },
        PR.RPC.Mode.OTHERS
      );
    }

    if (loserId === this.playerId) {
      this.onPlayerWin(winnerId!);
    }
  }

  private onSystemUpdated(system: System) {
    const from = this.state.world.systemMap.get(system.id)!;
    Object.assign(from, system);

    if (from.ownerId === this.playerId) {
      this.game.visitSystem(this.state, from);
    } else {
      ui.deselect(from.id);
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
          this.state.world = this.game.worldFromJson(world);
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
    const restart = await ui.showEndGame('Are you sure you want to quit?');
    if (!restart) return false;
    this.reload();
    return true;
  }

  protected async onPlayerWin(winnerId: string, message?: string) {
    console.log('onPlayerWin', { winnerId, message }, this.playerId);
    if (message) {
      ui.addMessage(message);
    }

    this.game.revealAllSystems(this.state);
    ui.clearSelection();

    let restart = false;
    if (winnerId === this.playerId) {
      trackEvent('starz_gamesWon');
      restart = await ui.showEndGame(`You have conquered The Bubble!`);
    } else {
      trackEvent('starz_gamesLost', { winnerId });
      restart = await ui.showEndGame(
        `You have lost your homeworld! Click to return to lobby.  ESC to spectate.`
      );
    }
    console.log('restart?', restart);
    if (restart) this.reload();
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
    ui.setupDialogs();
    ui.setupKeboardControls();

    this.events.on('PLAYER_WIN', ({ playerId, message }) => {
      this.onPlayerWin(playerId, message);
    });

    this.events.on('TAKE_ORDER', (order: Order) => {
      this.onTakeOrder(order);
    });

    this.events.on('MAKE_MOVE', (move: Move) => {
      this.onMakeMove(move);
    });

    this.events.on('PLAYER_QUIT', ({ playerId }) => {
      this.game.eliminatePlayer(this.getContext(), playerId);
    });

    this.events.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.onEliminatePlayer(loserId, winnerId);
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
