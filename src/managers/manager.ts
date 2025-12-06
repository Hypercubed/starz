import { TICK_DURATION_MS } from '../constants.ts';
import {
  type Move,
  type Order,
  type Player,
} from '../types.ts';
import type { Bot } from '../game/bots.ts';
import { GAME_STATUS, type FnContext, type GameStatus } from './types.ts';
import { eventBus } from '../events/index.ts';

import * as game from '../game/index.ts';
import type { GameState } from '../game/types.ts';

export abstract class GameManager {
  protected game = game;
  protected state = game.initalState();
  public config = game.gameConfig();
  protected gameState: GameStatus = GAME_STATUS.WAITING;

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
        gameState: this.gameState,
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
    this.gameState = GAME_STATUS.PLAYING;
    this.#runGameLoop();
  }

  protected gameStop() {
    this.gameState = GAME_STATUS.FINISHED;
    this.stopGameLoop();
  }

  public gameTick() {
    this.game.gameTick(this.getContext());
    eventBus.emit('STATE_UPDATED', {
      state: this.state,
      status: this.gameState
    });
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    this.game.eliminatePlayer(this.getContext(), loserId, winnerId);
  }

  protected onMakeMove(move: Move) {
    this.game.moves.makeMove(this.getContext(), move);

    eventBus.emit('STATE_UPDATED', {
      state: this.state,
      status: this.gameState
    });
  }

  protected onTakeOrder(order: Order) {
    const move = this.game.utilities.takeOrder(this.getContext(), order);
    if (move) {
      this.onMakeMove(move);
    }
  }

  #runGameLoop() {
    if (this.gameState !== GAME_STATUS.PLAYING) {
      this.gameStop();
      return;
    }

    this.stopGameLoop();
    this.gameTick();

    this.runningInterval = setTimeout(
      () => this.#runGameLoop(),
      TICK_DURATION_MS / this.state.timeScale
    );
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
    eventBus.on('GAME_STOP', () => {
      this.gameStop();
    });

    eventBus.on('GAME_START', () => {
      this.gameStart();
    });

    eventBus.on('PLAYER_ELIMINATED', ({ playerId, winnerId }) => {
      this.onEliminatePlayer(playerId, winnerId);
    });

    eventBus.on('MAKE_MOVE', (move) => {
      this.onMakeMove(move);
    });

    eventBus.on('TAKE_ORDER', (order) => {
      this.onTakeOrder(order);
    });
  }
}
