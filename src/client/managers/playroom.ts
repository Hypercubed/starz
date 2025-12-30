import * as ui from '../ui/index.ts';

import type { GameStatus } from './types.d.ts';
import type { Order } from '../game/types.d.ts';
import type { AppRootElement } from '../ui/components/app-root.ts';
import { LocalGameManager, type LocalGameManagerEvents } from './local.ts';
import {
  createEvent,
  type EventBusEmit,
  type EventBusOn
} from './classes/event-bus.ts';

const createEvents = () => {
  return {
    ROOM_CREATED: createEvent<{ roomId: string; isHost: boolean }>()
  };
};

type PlayroomGameManagerEvents = LocalGameManagerEvents &
  ReturnType<typeof createEvents>;

const PlayroomService = await import('./services/playroom.ts').then(
  (m) => m.PlayroomService
);

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

  isMultiplayer() {
    return true;
  }

  mount(appRoot: AppRootElement) {
    super.mount(appRoot);
    this.#registerEvents();
  }

  isHost() {
    return this.playroomService.isHost();
  }

  async waiting(roomCode?: string) {
    this.status = 'WAITING';
    await this.playroomService.connect(roomCode ?? undefined);
  }

  protected async gameSetup() {
    this.events.CLEAR_MESSAGES.dispatch();

    if (this.playroomService.isHost()) {
      super.gameSetup();
      this.playroomService.sendFullState(this.state);
    } else {
      await this.playroomService.getFullState();
      this.thisPlayer = this.state.playerMap.get(this.playerId)!;
      this.setupThisPlayer(this.playerId);
    }
  }

  public async gameTick() {
    if (this.playroomService.isHost()) {
      this.tick++;
      this.game.gameTick(this.getFnContext());
      this.game.checkVictory(this.getFnContext());
      this.playroomService.sendFastState();
    } else {
      this.playroomService.getFastState();
    }

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

  removeBot(id: string) {
    super.removeBot(id);
    this.playroomService.removePlayer(id);
  }

  setContext({ tick, status }: { tick?: number; status?: GameStatus }) {
    this.tick = tick ?? this.tick;
    this.status = status ?? this.status;
  }

  #registerEvents() {
    this.on('GAME_STARTED', () => {
      this.playroomService.onGameStarted();
    });

    this.on('PROCESS_ORDER', (order: Order) => {
      this.playroomService.sendOrder(order);
    });

    this.on('MOVE_COMPLETED', () => {
      this.playroomService.sendFastState();
    });

    this.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.playroomService.sendPlayerEliminated(loserId, winnerId ?? undefined);
    });
  }
}
