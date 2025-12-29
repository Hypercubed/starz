import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';

import type { GameStatus } from './types';
import type { Move, Order } from '../game/types';
import type { AppRootElement } from '../ui/components/app-root.ts';
import { LocalGameManager } from './local.ts';
import { isHost, myPlayer, type PlayerState } from 'playroomkit';
import { PlayroomService } from './services/playroom.ts';

export class PlayroomGameManager extends LocalGameManager {
  readonly name: string = 'PlayroomGameManager';

  private playerStates = new Map<string, PlayerState>();
  protected appRoot!: AppRootElement;

  private playroomService = new PlayroomService(this);

  mount(appRoot: AppRootElement) {
    super.mount(appRoot);
    this.#registerEvents();
  }

  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    // Create and add this player to make it available during setup
    const player = await this.initializePlayer();
    this.thisPlayer = this.onPlayerJoin(player);
    this.playerId = this.thisPlayer.id;

    this.events.GAME_INIT.dispatch();

    await this.playroomService.connect();
    this.playerId = myPlayer().id;
    this.start();
  }

  protected async gameSetup() {
    this.status = await this.playroomService.waitForStatus();

    console.log('Connected to Playroom.');
    console.log('Player ID:', myPlayer().id);
    console.log('Is Host:', isHost());

    this.playerId = myPlayer().id;

    this.events.CLEAR_MESSAGES.dispatch();

    if (isHost()) {
      super.gameSetup();
      this.playroomService.setSetupState();
    } else {
      const { world, players, status } =
        await this.playroomService.getSetupState();

      this.status = status;
      this.state.world = this.game.worldFromJson(world);

      for (const player of players) {
        this.addPlayer(player);
      }

      this.thisPlayer = this.state.playerMap.get(this.playerId)!;
      this.setupThisPlayer(this.playerId);
    }
  }

  public gameTick() {
    this.tick++;

    this.game.gameTick(this.getFnContext(), !isHost());

    this.playroomService.sendStateToPlayroom();
    this.playroomService.getStateFromPlayroom();

    this.game.checkVictory(this.getFnContext());
    this.events.STATE_UPDATED.dispatch({
      state: this.state,
      status: this.status
    });
  }

  async playerJoin(playerState: PlayerState) {
    console.log('Player joined:', playerState.id);

    if (this.status !== 'WAITING') return;

    this.playerStates.set(playerState.id, playerState);

    playerState.onQuit(() => {
      this.playerStates.delete(playerState.id);
    });

    if (this.state.playerMap.has(playerState.id)) return;

    const profile = playerState.getProfile();
    const name = profile.name || playerState.id;
    const id = playerState.id;
    const bot: Bot = (playerState as any).bot?.gameBot ?? undefined;
    const color = profile.color?.hexString ?? undefined;
    this.onPlayerJoin({ name, id, bot, color });
  }

  protected restart() {
    this.stopGameLoop();
    ui.clearSelection();

    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
  }

  async quit() {
    const ret = await this.showEndGame('Are you sure you want to quit?');
    if (ret) {
      this.game.eliminatePlayer(this.getFnContext(), this.playerId);
    }
  }

  setContext({ tick, status }: { tick: number; status: GameStatus }) {
    this.tick = tick;
    this.status = status;
  }

  #registerEvents() {
    this.on('TAKE_ORDER', (order: Order) => {
      this.playroomService.sendOrder(order);
    });

    this.on('MAKE_MOVE', (move: Move) => {
      this.playroomService.sendMove(move);
    });

    this.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.playroomService.sendPlayerEliminated(loserId, winnerId);
    });
  }
}
