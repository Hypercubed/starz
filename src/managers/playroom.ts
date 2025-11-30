import * as playroomkit from 'playroomkit';

import { assignSystem, generateMap } from '../game/generate';
import { rerender } from '../render/render';
import { Bot } from '../game/bots';
import { GameManager } from './manager';
import type { Move, PlayerStats, System } from '../types';
import { Graph, type GraphJSON } from '../classes/graph';
import { updateInfoBox, updateLeaderbox, updateMessageBox } from '../render/ui';
import { resetState, state } from '../game/state';
import { GAME_STATE } from './types';

class PlayroomBot extends playroomkit.Bot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);

    this.gameBot = new Bot();
  }
}

const PLAYROOM_STATES = {
  GAME_STATE: 'GAME_STATE',
  WORLD: 'WORLD'
} as const;

const PLAYROOM_EVENTS = {
  PLAYER_CONNECTED: 'PLAYER_CONNECTED',
  GAME_STARTED: 'GAME_STARTED',
  MOVE_MADE: 'MOVE_MADE'
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
  async connect() {
    this.registerEvents();

    this.stopGame();
    this.gameState = GAME_STATE.WAITING;

    resetState();
    playroomkit.resetStates();

    await playroomkit.insertCoin({
      gameId: 'etTt5RuPbZxwWPXQvYzF',
      persistentMode: true,
      enableBots: true,
      botOptions: {
        botClass: PlayroomBot
      },
      maxPlayersPerRoom: 5,
      defaultStates: {
        [PLAYROOM_STATES.GAME_STATE]: GAME_STATE.WAITING
      }
    });

    if (playroomkit.isHost()) {
      generateMap();

      state.players.forEach((player) => {
        assignSystem(player.id);
      });

      playroomkit.setState(PLAYROOM_STATES.WORLD, state.world.toJSON(), true);
    } else {
      const world = await playroomkit.waitForState<GraphJSON>(
        PLAYROOM_STATES.WORLD
      );
      state.world = Graph.fromJSON(world);
    }

    super.setupThisPlayer(playroomkit.myPlayer().id);
    super.setupGame();
    super.startGame();
    rerender();
  }

  runGameLoop() {
    this.syncState();
    super.runGameLoop();
  }

  private syncState() {
    if (playroomkit.isHost()) {
      playroomkit.setState('tick', state.tick, false);
      playroomkit.setState(
        'playerStats',
        state.players.map((p) => p.stats),
        false
      );
    } else {
      state.tick = playroomkit.getState('tick') as number;
      const playerStats = playroomkit.getState('playerStats') as PlayerStats[];

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

  playerJoin(playerState: playroomkit.PlayerState) {
    const profile = playerState.getProfile();
    if (!profile) return;

    if (state.playerMap.has(playerState.id)) return;

    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const color = profile.color?.hexString ?? 'red';
    super.addPlayer(profile.name || playerState.id, playerState.id, bot, color);

    // playerState.onQuit(() => {
    //   // Handle player quitting.
    // });
  }

  makeMove(move: Move) {
    super.makeMove(move);

    const from = state.world.nodeMap.get(move.fromId)!;
    const to = state.world.nodeMap.get(move.toId)!;

    const data = { move, from, to } satisfies MoveMadeEventData;

    playroomkit.RPC.call(
      PLAYROOM_EVENTS.MOVE_MADE,
      data,
      playroomkit.RPC.Mode.ALL
    );
  }

  registerEvents() {
    playroomkit.RPC.register(
      PLAYROOM_EVENTS.MOVE_MADE,
      async (data: MoveMadeEventData) => {
        const from = state.world.nodeMap.get(data.move.fromId)!;
        const to = state.world.nodeMap.get(data.move.toId)!;

        Object.assign(from, data.from);
        Object.assign(to, data.to);
      }
    );

    playroomkit.onPlayerJoin((playerState) => this.playerJoin(playerState));
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
