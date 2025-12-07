import { EventBus } from '../classes/EventBus.ts';
import { TICK_DURATION_MS } from '../constants.ts';
import * as game from '../game/index.ts';

import type { FnContext, GameStatus } from './types.d.ts';
import type { Bot } from '../game/bots.ts';
import type { GameEventMap, GameState, Move, Order } from '../game/types.d.ts';
import type { Player } from '../types.d.ts';

export abstract class GameManager {
  events = new EventBus<GameEventMap>();

  protected game = game;
  protected state = game.initalState();
  public config = game.defaultConfig();

  protected gameStatus: GameStatus = 'WAITING';

  constructor() {
    this.#registerEventListeners();
  }

  private runningInterval: number | null = null;

  abstract connect(): Promise<void>;

  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }

  getContext(): FnContext {
    return {
      G: this.state,
      // E: this.events,
      C: {
        gameStatus: this.gameStatus,
        gameConfig: this.config
      }
    };
  }

  protected addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ): Player | undefined {
    if (this.state.playerMap.has(playerId)) return;

    const player = {
      name,
      id: playerId,
      bot,
      stats: { playerId: playerId, systems: 0, ships: 0, homeworld: 0 },
      color,
      isAlive: true,
      visitedSystems: new Set<string>(),
      revealedSystems: new Set<string>()
    } satisfies Player;
    game.addPlayer(this.state, player);

    return player;
  }

  protected gameStart() {
    this.gameStatus = 'PLAYING';
    this.#runGameLoop();
  }

  protected gameStop() {
    this.gameStatus = 'FINISHED';
    this.stopGameLoop();
  }

  public gameTick() {
    this.game.gameTick(this.getContext());
    this.events.emit('STATE_UPDATED', {
      state: this.state,
      status: this.gameStatus
    });
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    this.game.eliminatePlayer(this.getContext(), loserId, winnerId);
  }

  protected onMakeMove(move: Move) {
    this.game.moves.makeMove(this.getContext(), move);

    this.events.emit('STATE_UPDATED', {
      state: this.state,
      status: this.gameStatus
    });
  }

  protected onTakeOrder(order: Order) {
    const move = this.game.utilities.takeOrder(this.getContext(), order);
    if (move) {
      this.onMakeMove(move);
    }
  }

  #runGameLoop() {
    if (this.gameStatus !== 'PLAYING') {
      this.gameStop();
      return;
    }

    this.stopGameLoop();
    this.gameTick();

    this.runningInterval = setTimeout(
      () => this.#runGameLoop(),
      TICK_DURATION_MS / this.config.timeScale
    ) as unknown as number;
  }

  protected startGameLoop() {
    this.#runGameLoop();
  }

  protected stopGameLoop() {
    if (this.runningInterval) {
      clearTimeout(this.runningInterval);
      this.runningInterval = null;
    }
  }

  #registerEventListeners() {
    this.events.on('GAME_STOP', () => {
      this.gameStop();
    });

    this.events.on('GAME_START', () => {
      this.gameStart();
    });

    this.events.on('PLAYER_ELIMINATED', ({ playerId, winnerId }) => {
      this.onEliminatePlayer(playerId, winnerId);
    });

    this.events.on('MAKE_MOVE', (move) => {
      this.onMakeMove(move);
    });

    this.events.on('TAKE_ORDER', (order) => {
      this.onTakeOrder(order);
    });
  }
}
