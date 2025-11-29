import {
  Bot as _PlayroomBot,
  getState,
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  setState,
  type PlayerState
} from 'playroomkit';

import { addMessage, state } from '../game/state';
import { assignSystem } from '../game/generate';
import { centerOnHome, rerender } from '../render/render';
import { Bot } from '../game/bots';
import { GameManager } from './game-manager';
import { revealSystem } from '../game/actions';
import type { Player } from '../types';
import { Graph } from '../classes/graph';

class PlayroomBot extends _PlayroomBot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);

    this.gameBot = new Bot();
  }
}

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
  }

  runGameLoop() {
    super.runGameLoop();
    this.syncState();
  }

  private syncState() {
    if (isHost()) {
      setState('tick', state.tick, false);
      setState('world', state.world.toJSON(), false);
      // setState("state", { ...state, world: undefined, players: undefined }, false);
      // setState("players", state.players.map(p => ({ ...p, bot: undefined })), false);
    } else {
      state.tick = getState('tick');

      const world = getState('world');
      state.world = world ? Graph.fromJSON(world) : state.world;

      // const players = getState("players");
      // state.players = players ?? state.players;

      // const s = getState("state") as typeof state;
      // Object.assign(state, { messages: s.messages });
      rerender();
    }
  }

  playerJoin(playerState: PlayerState) {
    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const profile = playerState.getProfile();

    const colorIndex = state.players.length + 1;
    const { hexString } = profile.color;

    const player = {
      name: profile.name || `${playerState.id}`,
      id: `${colorIndex}`,
      bot,
      stats: { systems: 0, ships: 0, homeworld: 0 },
      colorIndex,
      color: hexString
    } satisfies Player;

    state.players.push(player);

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
}
