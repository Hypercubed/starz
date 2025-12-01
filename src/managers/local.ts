import { init } from '@paralleldrive/cuid2';
import {
  COLORS,
  NumBots,
  NumHumanPlayers,
  START_PAUSED
} from '../core/constants';
import { Bot } from '../game/bots';
import { assignSystem, generateMap } from '../game/generate';
import { resetState, state } from '../game/state';
import { rerender } from '../render/render';
import { showStartGame } from '../render/ui';
import { GameManager } from './manager';
import { GAME_STATE } from './types';

const createId = init({ length: 5 });

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

    if (START_PAUSED) {
      showStartGame();
    } else {
      super.startGame();
    }

    rerender();
  }

  playerJoin(playerIndex: number) {
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot({ playerIndex }) : undefined;

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
