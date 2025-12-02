import type { Bot } from '../game/bots.ts';
import { assignSystem, generateMap } from '../game/generate.ts';
import { resetState } from '../game/state.ts';
import type { Player } from '../types.ts';
import { GameManager } from './manager.ts';
import { GAME_STATE } from './types.ts';

export class SimGameManager extends GameManager {
  async connect() {
    this.stopGame();
    this.gameState = GAME_STATE.WAITING;

    resetState();
    generateMap();
  }

  addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ): Player | undefined {
    const player = super.addPlayer(name, playerId, bot, color);
    assignSystem(playerId);
    return player;
  }
}
