import * as ui from '../ui/index.ts';

import type { GameStatus } from './types';
import type { Move, Order } from '../game/types';
import type { AppRootElement } from '../ui/components/app-root.ts';
import { LocalGameManager, type LocalGameManagerEvents } from './local.ts';
import { isHost, myPlayer } from 'playroomkit';
import { PlayroomService } from './services/playroom.ts';
import {
  createEvent,
  type EventBusEmit,
  type EventBusOn
} from '../classes/event-bus.ts';

const createEvents = () => {
  return {
    ROOM_CREATED: createEvent<{ roomId: string; isHost: boolean }>()
  };
};

type PlayroomGameManagerEvents = LocalGameManagerEvents &
  ReturnType<typeof createEvents>;

export class PlayroomGameManager extends LocalGameManager {
  readonly name: string = 'PlayroomGameManager';

  declare protected events: PlayroomGameManagerEvents;
  declare on: EventBusOn<PlayroomGameManagerEvents>;
  declare emit: EventBusEmit<PlayroomGameManagerEvents>;

  private playroomService = new PlayroomService(this);

  constructor() {
    super();
    this.addEvents(createEvents());
  }

  mount(appRoot: AppRootElement) {
    super.mount(appRoot);
    this.#registerEvents();
  }

  isHost() {
    return isHost() ?? true;
  }

  async waiting(roomCode?: string) {
    this.status = 'WAITING';
    await this.playroomService.connect(roomCode ?? undefined);
  }

  protected async gameSetup() {
    this.status = await this.playroomService.waitForStatus();

    console.log('Connected to Playroom.');
    console.log('Player ID:', myPlayer().id);
    console.log('Is Host:', isHost());

    this.events.CLEAR_MESSAGES.dispatch();

    if (isHost()) {
      super.gameSetup();
      this.playroomService.sendSetupState();
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
    this.events.STATE_UPDATED.dispatch();
  }

  protected restart() {
    this.stopGameLoop();
    ui.clearSelection();

    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
  }

  async addBot() {
    const player = await super.addBot();
    if (!player) return;

    await this.playroomService.addBot(player);
    return player;
  }

  setContext({ tick, status }: { tick: number; status: GameStatus }) {
    this.tick = tick;
    this.status = status;
  }

  #registerEvents() {
    this.on('GAME_STARTED', () => {
      this.playroomService.onGameStarted();
    });

    this.on('PROCESS_ORDER', (order: Order) => {
      this.playroomService.onOrder(order);
    });

    this.on('MOVE_COMPLETED', (move: Move) => {
      this.playroomService.onMove(move);
    });

    this.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.playroomService.sendPlayerEliminated(loserId, winnerId ?? undefined);
    });
  }
}
