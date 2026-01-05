import * as ui from '../ui/index.ts';

import type { GameStatus, GetEventMap, ManagerFeatures, Prettify } from './types.d.ts';
import type { Order } from '../game/types.d.ts';
import type { AppRootElement } from '../ui/components/app-root.ts';
import { createLocalManagerEvents, LocalGameManager } from './local.ts';
import { MiniSignal, MiniSignalEmitter } from 'mini-signals';

const createPlayroomManagerEvents = () => {
  return {
    ...createLocalManagerEvents(),
    TEST: new MiniSignal<[void]>(),
    ROOM_CREATED: new MiniSignal<[{
      roomId: string;
      isHost: boolean;
    }]>(),
  };
};

const PlayroomService = await import('./services/playroom.ts').then(
  (m) => m.PlayroomService
);

type SignalMap = ReturnType<typeof createPlayroomManagerEvents>;
type Events = Prettify<GetEventMap<SignalMap>>;

export class PlayroomGameManager extends LocalGameManager implements MiniSignalEmitter<Events> {
  readonly name: string = 'PlayroomGameManager';

  declare protected signals: SignalMap;
  declare on: MiniSignalEmitter<Events>['on'];
  declare emit: MiniSignalEmitter<Events>['emit'];

  private playroomService = new PlayroomService(this);

  readonly isHost = () => this.playroomService.isHost.get();
  readonly getRoomCode = () => this.playroomService.roomCode.get() ? 'R' + this.playroomService.roomCode.get() : null;

  readonly features: ManagerFeatures = {
    multiplayer: true,
    leaderboard: false
  };

  constructor() {
    super(createPlayroomManagerEvents());
  }

  mount(appRoot: AppRootElement) {
    super.mount(appRoot);
    this.#registerEvents();
  }

  async waiting(roomCode?: string) {
    this.status = 'WAITING';
    await this.playroomService.connect(roomCode ?? undefined);
  }

  protected async gameSetup() {
    this.signals.CLEAR_MESSAGES.dispatch();

    if (this.playroomService.isHost.get()) {
      super.gameSetup();
      this.playroomService.setFullState(this.state);
    } else {
      await this.playroomService.getFullState();
      this.thisPlayer = this.state.playerMap.get(this.playerId)!;
      this.setupThisPlayer(this.playerId);
    }
  }

  public async gameTick() {
    if (this.playroomService.isHost.get()) {
      this.tick++;
      this.game.gameTick(this.getFnContext());
      this.game.checkVictory(this.getFnContext());
      this.playroomService.setFastState();
    } else {
      this.playroomService.getFastState();
    }

    this.signals.STATE_UPDATED.dispatch();
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

  removeBot(id: string): boolean {
    if (super.removeBot(id)) {
      this.playroomService.removePlayer(id);
      return true;
    }
    return false;
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
      this.playroomService.setFastState();
    });

    this.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.playroomService.sendPlayerEliminated(loserId, winnerId ?? undefined);
    });
  }
}
