import { GameManager } from './manager.ts';

import type { Player } from '../types.ts';

export class SimGameManager extends GameManager {
  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    this.state = this.game.initalState();
    this.game.generateMap(this.getContext());
  }

  addPlayer(player: Partial<Player> & { id: string }): Player {
    const _player = super.addPlayer(player);
    this.game.assignSystem(this.state, _player.id);
    return _player;
  }
}
