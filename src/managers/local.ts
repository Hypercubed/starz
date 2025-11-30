import { init } from '@paralleldrive/cuid2';
import { NumBots, NumHumanPlayers, START_PAUSED } from '../core/constants';
import { Bot } from '../game/bots';
import { assignSystem, generateMap } from '../game/generate';
import { addMessage, resetState, state } from '../game/state';
import { rerender } from '../render/render';
import { showStartGame } from '../render/ui';
import { GameManager } from './manager';
import { GAME_STATE } from './types';

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
  async connect() {
    this.stopGame();
    this.gameState = GAME_STATE.WAITING;

    resetState();

    generateMap();

    const totalPlayers = NumHumanPlayers + NumBots;

    for (let i = 1; i <= totalPlayers; i++) {
      this.playerJoin(i);
      assignSystem(state.players[i - 1].id);
    }

    const thisPlayer = state.players[0];

    super.setupThisPlayer(thisPlayer.id);
    super.setupGame();

    addMessage(`You are Player ${thisPlayer.name}.`);

    if (START_PAUSED) {
      showStartGame();
    } else {
      super.startGame();
    }

    rerender();
  }

  playerJoin(playerIndex: number) {
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot() : undefined;

    const color = COLORS[playerIndex];
    const name = /* bot?.name ?? */ `${playerIndex}`;

    const playerId = createId();
    super.addPlayer(name, playerId, bot, color);
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
