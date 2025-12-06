import { GameManager } from './manager.ts';

import type { Bot } from '../game/bots.ts';
import type { Player } from '../types.ts';

export class SimGameManager extends GameManager {
  async connect() {
    this.gameStop();
    this.gameState = 'WAITING';

    this.state = this.game.initalState();
    this.game.generateMap(this.getContext());
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
