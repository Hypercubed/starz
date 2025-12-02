import * as PR from 'playroomkit';

import { assignSystem, generateMap } from '../game/generate';
import { rerender } from '../render/render';
import { Bot } from '../game/bots';
import type { Move, Order, Player, PlayerStats, System } from '../types';
import { Graph, type GraphJSON } from '../classes/graph';
import { updateInfoBox, updateLeaderbox, updateMessageBox } from '../render/ui';
import {
  removeSystemSelect,
  resetState,
  revealSystem,
  state
} from '../game/state';
import { GAME_STATE } from './types';
import { COLORS } from '../core/constants';
import { LocalGameManager } from './local';

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

export class PlayroomGameManager extends LocalGameManager {
  playerStates = new Map<string, PR.PlayerState>();

  async connect() {
    this.registerPlayroomEvents();

    this.stopGame();
    this.gameState = GAME_STATE.WAITING;

    resetState();
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
        [PLAYROOM_STATES.GAME_STATE]: GAME_STATE.WAITING
      }
    });

    console.log('Connected to Playroom.');
    console.log('Player ID:', PR.myPlayer().id);
    console.log('Is Host:', PR.isHost());

    // For some reason sometimes host is not added
    if (!state.playerMap.has(PR.myPlayer().id)) {
      this.addPlayerProfile(PR.myPlayer());
    }

    if (PR.isHost()) {
      generateMap();

      state.players.forEach((player) => assignSystem(player.id));

      console.log('Generated world and players as host.');

      PR.setState(PLAYROOM_STATES.WORLD, state.world.toJSON(), true);
      PR.setState(PLAYROOM_STATES.PLAYERS, playersToJson(state.players), true);
    } else {
      const world = await PR.waitForState<GraphJSON>(PLAYROOM_STATES.WORLD);
      const players = await PR.waitForState<Player[]>(PLAYROOM_STATES.PLAYERS);

      console.log('Received world and players from host.');

      state.world = Graph.fromJSON(world);
      players.forEach((stats) => {
        super.addPlayer(stats.name, stats.id, undefined, stats.color);
      });
    }

    console.log(
      'Restoring player state from Playroom state.',
      PR.myPlayer().id
    );
    super.setupThisPlayer(PR.myPlayer().id);

    // const playerJson = PR.myPlayer().getState(PLAYER_STATES.PLAYER) as any;
    // if (playerJson) {
    //   const p = playerFromJson(playerJson);
    //   const localPlayer = state.playerMap.get(state.thisPlayerId!)!;
    //   console.log('Restoring local player state from Playroom state.', p, localPlayer);
    //   Object.assign(localPlayer, p);
    // }

    this.setupUI();

    // Adjust colors as needed
    const colorsAvailable = new Set<string>(COLORS);
    const colorsUsed = new Set<string>();

    state.players.forEach((player) => {
      if (colorsUsed.has(player.color)) {
        player.color =
          colorsAvailable.values().next().value || getRandomColor();
      }

      colorsAvailable.delete(player.color);
      colorsUsed.add(player.color);
    });

    super.startGame();
    rerender();
  }

  gameTick() {
    this.syncState();
    super.gameTick();
  }

  private syncState() {
    PR.myPlayer().setState(
      PLAYER_STATES.PLAYER,
      playersToJson(state.players),
      false
    );

    if (PR.isHost()) {
      PR.setState(PLAYROOM_STATES.TICK, state.tick, false);
      PR.setState(
        PLAYROOM_STATES.PLAYER_STATS,
        state.players.map((p) => p.stats),
        false
      );
      PR.setState(PLAYROOM_STATES.GAME_STATE, this.gameState, false);
      PR.setState(PLAYROOM_STATES.WORLD, state.world.toJSON(), false);
      PR.setState(PLAYROOM_STATES.PLAYERS, playersToJson(state.players), false);
    } else {
      state.tick = PR.getState(PLAYROOM_STATES.TICK) as number;
      // this.gameState = PR.getState(PLAYROOM_STATES.GAME_STATE) as GameState;

      if (state.tick % 10 === 0) {
        const world = PR.getState(PLAYROOM_STATES.WORLD) as GraphJSON;
        if (world) {
          state.world = Graph.fromJSON(world);
        }
      }

      const playerStats = PR.getState(
        PLAYROOM_STATES.PLAYER_STATS
      ) as PlayerStats[];
      if (playerStats) {
        state.players.forEach((p) => {
          const stats = playerStats.find((s) => s.playerId === p.id);
          if (stats) {
            p.stats = stats;
          }
        });
      }

      rerender();
      updateInfoBox();
      updateLeaderbox();
      updateMessageBox();
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

  private addPlayerProfile(playerState: PR.PlayerState) {
    if (state.playerMap.has(playerState.id)) return;

    const profile = playerState.getProfile();
    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const color = profile.color?.hexString ?? COLORS[state.players.length];
    super.addPlayer(profile.name || playerState.id, playerState.id, bot, color);
  }

  takeOrder(order: Order) {
    // Optimistically apply the order immediately.
    super.takeOrder(order);

    // Notify the host of the order.
    if (!PR.isHost()) {
      PR.RPC.call(PLAYROOM_EVENTS.ORDER_GIVEN, order, PR.RPC.Mode.HOST);
    }
  }

  makeMove(move: Move) {
    // Apply the move locally.
    super.makeMove(move);

    // Notify other players of the updated systems.
    if (PR.isHost()) {
      PR.RPC.call(
        PLAYROOM_EVENTS.UPDATE_SYSTEM,
        state.world.systemMap.get(move.fromId),
        PR.RPC.Mode.OTHERS
      );

      PR.RPC.call(
        PLAYROOM_EVENTS.UPDATE_SYSTEM,
        state.world.systemMap.get(move.toId),
        PR.RPC.Mode.OTHERS
      );
    }
  }

  eliminatePlayer(loserId: string, winnerId: string) {
    if (PR.isHost()) {
      super.eliminatePlayer(loserId, winnerId);

      PR.setState(PLAYROOM_STATES.WORLD, state.world.toJSON(), false);

      PR.RPC.call(
        PLAYROOM_EVENTS.PLAYER_ELIMINATED,
        { loserId, winnerId },
        PR.RPC.Mode.OTHERS
      );
    }
  }

  private registerPlayroomEvents() {
    PR.RPC.register(PLAYROOM_EVENTS.UPDATE_SYSTEM, async (system: System) => {
      const from = state.world.systemMap.get(system.id)!;
      Object.assign(from, system);

      if (from.ownerId === state.thisPlayerId) {
        revealSystem(from);
      } else {
        removeSystemSelect(from.id);
      }

      rerender();
    });

    PR.RPC.register(PLAYROOM_EVENTS.ORDER_GIVEN, async (order: Order) => {
      super.takeOrder(order);
    });

    PR.RPC.register(
      PLAYROOM_EVENTS.PLAYER_ELIMINATED,
      async (data: PlayerEliminatedEventData) => {
        super.eliminatePlayer(data.loserId, data.winnerId);

        const world = PR.getState(PLAYROOM_STATES.WORLD) as GraphJSON;
        if (world) {
          state.world = Graph.fromJSON(world);
        }

        rerender();
      }
    );

    PR.onPlayerJoin((playerState) => this.playerJoin(playerState));
  }

  async quit() {
    const restart = await super.quit();
    if (!restart) return false;
    this.reload();
    return true;
  }

  async playerWin() {
    await super.playerWin();
    this.reload();
    return true;
  }

  async playerLose(winner: string) {
    await super.playerLose(winner);
    this.reload();
    return true;
  }

  private reload() {
    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
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
