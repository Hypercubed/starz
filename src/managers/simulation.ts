import type { Bot } from '../game/bots.ts';
import type { Player } from '../types.ts';
import { GameManager } from './manager.ts';
import { GAME_STATUS } from './types.ts';

export class SimGameManager extends GameManager {
  async connect() {
    this.stopGame();
    this.gameState = GAME_STATUS.WAITING;

    this.state = this.game.initalState();
    this.game.generateMap(this.state);
  }

  addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ): Player | undefined {
    const player = super.addPlayer(name, playerId, bot, color);
    this.game.assignSystem(this.state, playerId);
    return player;
  }
}
