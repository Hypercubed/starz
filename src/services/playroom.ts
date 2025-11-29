import {
  Bot as _PlayroomBot,
  getState,
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  RPC,
  setState,
  type PlayerState
} from 'playroomkit';

import { addMessage, addPlayer, getPlayersHomeworld, state } from '../game/state';
import { assignSystem } from '../game/generate';
import { centerOnHome, rerender } from '../render/render';
import { Bot } from '../game/bots';
import { GameManager } from './game-manager';
import { revealSystem } from '../game/actions';
import type { Move, Player, PlayerStats, System } from '../types';
import { Graph, type GraphJSON } from '../classes/graph';
import { updateInfoBox, updateLeaderbox, updateMessageBox } from '../render/ui';

class PlayroomBot extends _PlayroomBot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);

    this.gameBot = new Bot();
  }
}

const PLAYROOM_EVENTS = {
  PLAYER_CONNECTED: 'PLAYER_CONNECTED',
  GAME_STARTED: 'GAME_STARTED',
  MOVE_MADE: 'MOVE_MADE',
} as const;

export type MoveMadeEventData = {
  move: Move;
  from: System;
  to: System;
};

export type GameStartedEventData = {
  world: GraphJSON;
};

export class PlayroomGameManager extends GameManager {
  constructor() {
    super();
    this.registerEvents();
  }

  async connect() {
    await insertCoin({
      gameId: 'etTt5RuPbZxwWPXQvYzF',
      persistentMode: true,
      enableBots: true,
      botOptions: {
        botClass: PlayroomBot
      },
      maxPlayersPerRoom: 5
    });

    super.setupGame();
    super.startGame();

    onPlayerJoin((playerState) => this.playerJoin(playerState));

    if (isHost()) {
      const data = {
        world: state.world.toJSON(),
      } satisfies GameStartedEventData;

      await RPC.call(PLAYROOM_EVENTS.GAME_STARTED, data, RPC.Mode.OTHERS);
    }
  }

  runGameLoop() {
    super.runGameLoop();
    this.syncState();
  }

  private syncState() {
    if (isHost()) {
      setState('tick', state.tick, false);
      setState('playerStats', state.players.map(p => p.stats), false);
    } else {
      state.tick = getState('tick') as number;
      const playerStats = getState('playerStats') as PlayerStats[];
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

  playerJoin(playerState: PlayerState) {
    const profile = playerState.getProfile();
    if (state.playerMap.has(playerState.id)) return;

    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;

    const colorIndex = state.players.length + 1;
    const { hexString } = profile.color;

    const player = {
      name: profile.name || playerState.id,
      id: playerState.id,
      bot,
      stats: { playerId: playerState.id, systems: 0, ships: 0, homeworld: 0 },
      colorIndex,
      color: hexString
    } satisfies Player;

    addPlayer(player);

    if (bot) {
      assignSystem(player.id);
      bot.id = player.id;
    } else {
      const s = assignSystem(player.id);

      if (playerState.id === myPlayer().id) {
        state.thisPlayer = player.id;
        state.lastSelectedSystem = s;
        state.selectedSystems = [s];

        revealSystem(s);
        centerOnHome();
        addMessage(`You are Player ${player.name}.`);
      }
    }

    if (isHost()) {
      const data = {
        world: state.world.toJSON(),
      } satisfies GameStartedEventData;

      RPC.call(PLAYROOM_EVENTS.GAME_STARTED, data, RPC.Mode.OTHERS); // TODO: remove
    }

    if (hexString) {
      document.documentElement.style.setProperty(
        `--player-${player.id}`,
        hexString
      );

      document.documentElement.style.setProperty(
        `--player-${player.colorIndex}`,
        hexString
      );
    }

    // playerState.onQuit(() => {
    //   // Handle player quitting.
    // });
  }

  makeMove(move: Move) {
    super.makeMove(move);

    const from = state.world.nodeMap.get(move.fromId)!;
    const to = state.world.nodeMap.get(move.toId)!;

    const data = { move, from, to } satisfies MoveMadeEventData;

    RPC.call(PLAYROOM_EVENTS.MOVE_MADE, data, RPC.Mode.ALL).catch((error) => {
      console.log(error);
    });
  }

  registerEvents() {
    super.registerEvents();

    RPC.register(PLAYROOM_EVENTS.GAME_STARTED, async (data: GameStartedEventData) => {
      state.world = Graph.fromJSON(data.world);

      // const homeworld = getPlayersHomeworld()!;
      // revealSystem(homeworld);
      centerOnHome();
    });

    RPC.register(PLAYROOM_EVENTS.MOVE_MADE, async (data: MoveMadeEventData) => {
      const from = state.world.nodeMap.get(data.move.fromId)!;
      const to = state.world.nodeMap.get(data.move.toId)!;

      Object.assign(from, data.from);
      Object.assign(to, data.to);
    });
  }
}
