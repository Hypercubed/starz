import * as PR from 'playroomkit';

import { Bot } from '../game/bots';
import type { Lane, Move, Order, Player, PlayerStats, System } from '../types';
import { Graph, type GraphJSON } from '../classes/graph';

import * as game from '../game/index.ts';
import * as renderer from '../ui/index.ts';

import { GAME_STATUS } from './types';
import { COLORS } from '../constants.ts';
import { trackEvent } from '../utils/logging.ts';
import { GameManager } from './manager.ts';
import { clearSelection, deselect, select } from '../ui/selection.ts';

class PlayroomBot extends PR.Bot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);
    this.gameBot = new Bot();
  }
}

const PLAYROOM_STATES = {
  GAME_STATE: 'GAME_STATE',
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

    this.stopGame();
    this.gameState = GAME_STATUS.WAITING;

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
        [PLAYROOM_STATES.GAME_STATE]: GAME_STATUS.WAITING
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
      game.generateMap(this.state);

      this.state.players.forEach((player) =>
        game.assignSystem(this.state, player.id)
      );

      console.log('Generated world and players as host.');

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world.toJSON(), true);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.players),
        true
      );
    } else {
      const world = await PR.waitForState<GraphJSON>(PLAYROOM_STATES.WORLD);
      const players = await PR.waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);

      console.log('Received world and players from host.');

      this.state.world = Graph.fromJSON(world);
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

    renderer.setupUI(this.getContext());

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

    this.startGame();
    renderer.rerender(this.getContext());
  }

  protected setupThisPlayer(playerId: string) {
    this.state.thisPlayerId = playerId;
    const homeworld = game.getPlayersHomeworld(this.state)!;
    game.revealSystem(this.state, homeworld);
    renderer.centerOnHome(this.getContext());
    clearSelection();
    select(homeworld.id);
  }

  protected startGame() {
    trackEvent('starz_gamesStarted');
    game.addMessage(this.state, `Game started.`);

    const player = this.state.playerMap.get(this.state.thisPlayerId!);
    if (player) {
      game.addMessage(this.state, `You are Player ${player.name}.`);
    }

    super.startGame();
  }

  protected gameTick() {
    this.syncState();

    super.gameTick();
    game.checkVictory(this.getContext());

    renderer.rerender(this.getContext());
    renderer.updateUI(this.state);
  }

  private syncState() {
    PR.myPlayer().setState(
      PLAYER_STATES.PLAYER,
      playersToJson(this.state.players),
      false
    );

    if (PR.isHost()) {
      PR.setState(PLAYROOM_STATES.TICK, this.state.tick, false);
      PR.setState(
        PLAYROOM_STATES.PLAYER_STATS,
        this.state.players.map((p) => p.stats),
        false
      );
      PR.setState(PLAYROOM_STATES.GAME_STATE, this.gameState, false);
      PR.setState(PLAYROOM_STATES.WORLD, this.state.world.toJSON(), false);
      PR.setState(
        PLAYROOM_STATES.PLAYERS,
        playersToJson(this.state.players),
        false
      );
    } else {
      this.state.tick = PR.getState(PLAYROOM_STATES.TICK) as number;
      // this.gameState = PR.getState(PLAYROOM_STATES.GAME_STATE) as GameState;

      if (this.state.tick % 10 === 0) {
        const world = PR.getState(PLAYROOM_STATES.WORLD) as GraphJSON;
        if (world) {
          this.state.world = Graph.fromJSON(world);
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

      renderer.rerender(this.getContext());
      renderer.updateUI(this.state);
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

  protected takeOrder(order: Order) {
    // Optimistically apply the order immediately.
    super.takeOrder(order);
    renderer.rerender(this.getContext());

    // Notify the host of the order.
    if (!PR.isHost()) {
      PR.RPC.call(PLAYROOM_EVENTS.ORDER_GIVEN, order, PR.RPC.Mode.HOST);
    }
  }

  protected makeMove(move: Move) {
    console.log('Applied move:', move);

    // Apply the move locally.
    super.makeMove(move);
    renderer.rerender(this.getContext());

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

  protected eliminatePlayer(loserId: string, winnerId: string | null) {
    if (PR.isHost()) {
      const loser = this.state.playerMap.get(loserId)!;
      const winner = this.state.playerMap.get(winnerId as any);

      const message =
        winnerId === null
          ? `Player ${loser.name} has been eliminated!`
          : `Player ${winner!.name} has eliminated Player ${loser.name}!`;

      game.addMessage(this.state, message);
      super.eliminatePlayer(loserId, winnerId);

      PR.setState(PLAYROOM_STATES.WORLD, this.state.world.toJSON(), false);

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

      if (from.ownerId === this.state.thisPlayerId) {
        game.revealSystem(this.state, from);
      } else {
        deselect(from.id);
      }

      renderer.rerender(this.getContext());
    });

    PR.RPC.register(PLAYROOM_EVENTS.ORDER_GIVEN, async (order: Order) => {
      this.events.takeOrder(order);
    });

    PR.RPC.register(
      PLAYROOM_EVENTS.PLAYER_ELIMINATED,
      async (data: PlayerEliminatedEventData) => {
        this.events.eliminatePlayer(data.loserId, data.winnerId);
        const world = PR.getState(PLAYROOM_STATES.WORLD) as GraphJSON;
        if (world) {
          this.state.world = Graph.fromJSON(world);
        }

        renderer.rerender(this.getContext());
      }
    );

    PR.onPlayerJoin((playerState) => this.playerJoin(playerState));
  }

  protected async quit() {
    const restart = await renderer.showEndGame('Quit?');
    if (!restart) return false;
    this.reload();
    return true;
  }

  protected async playerWin() {
    this.stopGame();

    game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesWon');
    await renderer.showEndGame(`You have conquered The Bubble!`);

    this.reload();
    return true;
  }

  protected async playerLose(winner: string) {
    this.stopGame();

    game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesLost', { winner });
    await renderer.showEndGame(`You have lost your homeworld! Game Over.`);

    this.reload();
    return true;
  }

  protected onSystemClick(event: PointerEvent, system: System) {
    renderer.onClickSystem(event, this.getContext(), system);
    renderer.rerender(this.getContext());
  }

  protected onLaneClick(event: PointerEvent, lane: Lane) {
    renderer.onClickLane(event, this.getContext(), lane);
    renderer.rerender(this.getContext());
  }

  private reload() {
    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
  }

  private registerUIEvents() {
    renderer.setupDialogs();
    renderer.setupKeboardControls();
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
    visitedSystems: Array.from(player.visitedSystems),
    revealedSystems: Array.from(player.revealedSystems)
  };
}

// function playerFromJson(player: any) {
//   return {
//     ...player,
//     visitedSystems: new Set<string>(player.visitedSystems),
//     revealedSystems: new Set<string>(player.revealedSystems)
//   }
// }
