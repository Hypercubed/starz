import {
  NumBots,
  NumHumanPlayers,
  PLAYER,
  START_PAUSED
} from '../core/constants';
import { Bot } from '../game/bots';
import { assignSystem } from '../game/generate';
import { state } from '../game/state';
import { rerender } from '../render/render';
import { showStartGame } from '../render/ui';
import { GAME_STATE, GameManager } from './game-manager';

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
      playerIndex > NumHumanPlayers ? new Bot({ playerIndex }) : undefined;
    const player = bot?.player ?? PLAYER; // For now, human is always PLAYER

    if (bot) {
      // For now, only assign system to bots, player 1 is already assigned
      assignSystem(player);
    }

    state.players.push({
      id: player,
      name: `${player}`,
      isHuman: player === PLAYER,
      bot,
      stats: { player: player, systems: 0, ships: 0, homeworld: 0 }
    });
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
