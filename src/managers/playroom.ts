import * as PR from 'playroomkit';

import { COLORS } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as game from '../game/index.ts';
import { worldFromJson } from '../game/world.ts';
import * as renderer from '../ui/index.ts';
import { clearSelection, deselect, select } from '../ui/selection.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player, PlayerStats } from '../types.ts';
import type { WorldJSON } from './types';
import type { Move, Order, System } from '../game/types';

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
    this.registerPlayroomEvents();

    this.gameStop();
    this.status = 'WAITING';

    this.state = game.initalState();
    PR.resetStates();

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

      this.state.players.forEach((player) =>
        game.assignSystem(this.state, player.id)
      );

      console.log('Generated world and players as host.');

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world, true);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.players),
        true
      );
    } else {
      const world = await PR.waitForState<WorldJSON>(PLAYROOM_STATES.WORLD);
      const players = await PR.waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);

      console.log('Received world and players from host.');

      this.state.world = worldFromJson(world);
      players.forEach((stats) => {
        this.addPlayer(stats.name, stats.id, undefined, stats.color);
      });
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

    this.state.players.forEach((player) => {
      if (colorsUsed.has(player.color)) {
        player.color =
          colorsAvailable.values().next().value || getRandomColor();
      }

      colorsAvailable.delete(player.color);
      colorsUsed.add(player.color);
    });

    this.gameStart();
    renderer.rerender();
  }

  protected setupThisPlayer(playerId: string) {
    this.playerId = playerId;
    const homeworld = game.getPlayersHomeworld(this.state)!;
    game.revealSystem(this.state, homeworld);
    renderer.centerOnHome();
    clearSelection();
    select(homeworld.id);
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    renderer.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId!);
    if (player) {
      renderer.addMessage(`You are Player ${player.name}.`);
    }

    super.gameStart();
  }

  public gameTick() {
    this.syncState();

    super.gameTick();
    game.checkVictory(this.getContext());
  }

  private syncState() {
    PR.myPlayer().setState(
      PLAYER_STATES.PLAYER,
      playersToJson(this.state.players),
      false
    );

    if (PR.isHost()) {
      PR.setState(PLAYROOM_STATES.TICK, this.tick, false);
      PR.setState(
        PLAYROOM_STATES.PLAYER_STATS,
        this.state.players.map((p) => p.stats),
        false
      );
      PR.setState(PLAYROOM_STATES.GAME_STATUS, this.status, false);

      const worldJSON = {
        systems: this.state.world.systems,
        lanes: this.state.world.lanes
      } satisfies WorldJSON;

      PR.setState(PLAYROOM_STATES.WORLD, worldJSON, false);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.players),
        false
      );
    } else {
      this.tick = PR.getState(PLAYROOM_STATES.TICK) as number;
      // this.gameState = PR.getState(PLAYROOM_STATES.GAME_STATE) as GameState;

      if (this.tick % 10 === 0) {
        const world = PR.getState(PLAYROOM_STATES.WORLD) as WorldJSON;
        if (world) {
          this.state.world = worldFromJson(world);
        }
      }

      const playerStats = PR.getState(
        PLAYROOM_STATES.PLAYER_STATS
      ) as PlayerStats[];
      if (playerStats) {
        this.state.players.forEach((p) => {
          const stats = playerStats.find((s) => s.playerId === p.id);
          if (stats) {
            p.stats = stats;
          }
        });
      }

      this.events.emit('STATE_UPDATED', {
        state: this.state,
        status: this.status
      });
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
    const color = profile.color?.hexString ?? COLORS[this.state.players.length];
    this.addPlayer(profile.name || playerState.id, playerState.id, bot, color);
  }

  protected onTakeOrder(order: Order) {
    // Optimistically apply the order immediately.
    super.onTakeOrder(order);

    // Notify the host of the order.
    if (!PR.isHost()) {
      PR.RPC.call(PLAYROOM_EVENTS.ORDER_GIVEN, order, PR.RPC.Mode.HOST);
    }
  }

  protected onMakeMove(move: Move) {
    // Apply the move locally.
    super.onMakeMove(move);

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
    }
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    if (PR.isHost()) {
      const loser = this.state.playerMap.get(loserId)!;
      const winner = this.state.playerMap.get(winnerId as any);

      const message =
        winnerId === null
          ? `Player ${loser.name} has been eliminated!`
          : `Player ${winner!.name} has eliminated Player ${loser.name}!`;

      renderer.addMessage(message);

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world, false);

      PR.RPC.call(
        PLAYROOM_EVENTS.PLAYER_ELIMINATED,
        { loserId, winnerId },
        PR.RPC.Mode.OTHERS
      );
    }
  }

  private registerPlayroomEvents() {
    PR.RPC.register(PLAYROOM_EVENTS.UPDATE_SYSTEM, async (system: System) => {
      const from = this.state.world.systemMap.get(system.id)!;
      Object.assign(from, system);

      if (from.ownerId === this.playerId) {
        game.revealSystem(this.state, from);
      } else {
        deselect(from.id);
      }

      this.events.emit('STATE_UPDATED', {
        state: this.state,
        status: this.status
      });
    });

    PR.RPC.register(PLAYROOM_EVENTS.ORDER_GIVEN, async (order: Order) => {
      this.onTakeOrder(order);
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

  protected async onThisPlayerWin() {
    this.gameStop();

    game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesWon');
    await renderer.showEndGame(`You have conquered The Bubble!`);

    this.reload();
    return true;
  }

  protected async onThisPlayerLose(winner: string) {
    this.gameStop();

    game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesLost', { winner });
    await renderer.showEndGame(`You have lost your homeworld! Game Over.`);

    this.reload();
    return true;
  }

  private reload() {
    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
  }

  private registerUIEvents() {
    renderer.setupDialogs();
    renderer.setupKeboardControls();

    this.events.on('PLAYER_LOSE', ({ winnerId }) => {
      this.onThisPlayerLose(winnerId!);
    });

    this.events.on('PLAYER_WIN', () => {
      this.onThisPlayerWin();
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

function playersToJson(players: Player[]) {
  return players.map(playerToJson);
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
