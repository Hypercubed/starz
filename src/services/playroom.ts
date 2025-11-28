import {
  Bot as _PlayroomBot,
  insertCoin,
  onPlayerJoin,
  type PlayerState
} from 'playroomkit';

import { state } from '../game/state';
import { assignSystem } from '../game/generate';
import { rerender } from '../render/render';
import { PLAYER } from '../core/constants';
import { Bot } from '../game/bots';
import { GameManager } from './game-manager';
import { syncState } from '../core/netplay';

class PlayroomBot extends _PlayroomBot {
  gameBot: Bot;

  constructor(options: any) {
    super(options);

    this.gameBot = new Bot();
  }
}

let playerId = 1;

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
    syncState();
  }

  playerJoin(playerState: PlayerState) {
    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const player = bot?.player ?? playerId++; // For now, human is always PLAYER

    if (player > 1) {
      assignSystem(player);
      rerender();
    }

    const profile = playerState.getProfile();

    state.players.push({
      name: profile.name || `${player}`,
      id: player,
      isHuman: player === PLAYER,
      bot,
      stats: { player: player, systems: 0, ships: 0, homeworld: 0 }
    });

    const { hexString } = profile.color;

    if (hexString) {
      document.documentElement.style.setProperty(
        `--player-${player}`,
        hexString
      );
    }

    // playerState.onQuit(() => {
    //   // Handle player quitting.
    // });
  }
}
