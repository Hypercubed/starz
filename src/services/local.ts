import { init } from '@paralleldrive/cuid2';
import { NumBots, NumHumanPlayers, START_PAUSED } from '../core/constants';
import { revealSystem } from '../game/actions';
import { Bot } from '../game/bots';
import { assignSystem } from '../game/generate';
import { addMessage, addPlayer, state } from '../game/state';
import { centerOnHome, rerender } from '../render/render';
import { showStartGame } from '../render/ui';
import type { Player } from '../types';
import { GAME_STATE, GameManager } from './game-manager';

const createId = init({ length: 5 });

const COLORS = [
  '#c0392b', // Red
  '#f1c40f', // Yellow
  '#9b59b6', // Purple
  '#00b386', // Green
  '#cc6600', // Orange
  '#0a4c8c' // Blue
];

export class LocalGameManager extends GameManager {
  constructor() {
    super();
  }

  async connect() {
    super.setupGame();
    this.reset();
  }

  reset() {
    const totalPlayers = NumHumanPlayers + NumBots;

    for (let i = 1; i <= totalPlayers; i++) {
      this.playerJoin(i);
    }
    rerender();

    if (START_PAUSED) {
      showStartGame();
    } else {
      this.startGame();
    }
  }

  playerJoin(playerIndex: number) {
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot() : undefined;

    const color = COLORS[playerIndex];

    const player = {
      id: createId(),
      name: `${playerIndex}`,
      bot,
      stats: { systems: 0, ships: 0, homeworld: 0 },
      colorIndex: playerIndex,
      color
    } satisfies Player;
    addPlayer(player);

    if (bot) {
      assignSystem(player.id);
      bot.id = player.id;
    } else {
      const s = assignSystem(player.id);
      state.thisPlayer = player.id;
      state.lastSelectedSystem = s;
      state.selectedSystems = [s];

      revealSystem(s);
      centerOnHome();
      addMessage(`You are Player ${player.name}.`);
    }

    if (color) {
      document.documentElement.style.setProperty(
        `--player-${player.id}`,
        color
      );

      document.documentElement.style.setProperty(
        `--player-${player.colorIndex}`,
        color
      );
    }
  }

  pauseToggle() {
    if (this.gameState === GAME_STATE.PAUSED) {
      this.gameState = GAME_STATE.PLAYING;
      this.runGameLoop();
    } else if (this.gameState === GAME_STATE.PLAYING) {
      this.gameState = GAME_STATE.PAUSED;
      this.stopGameLoop();
    }
  }
}
