import { TICK_DURATION_MS } from '../constants.ts';
import {
  type Lane,
  type Move,
  type Order,
  type Player,
  type System
} from '../types.ts';
import type { Bot } from '../game/bots.ts';
import { GAME_STATUS, type GameStatus } from './types.ts';

import * as game from '../game/index.ts';
import type { GameEvents, GameState } from '../game/types.ts';

export abstract class GameManager {
  protected game = game;
  protected state = game.initalState();
  protected gameState: GameStatus = GAME_STATUS.WAITING;

  protected events: GameEvents = {
    eliminatePlayer: (loserId: string, winnerId: string | null) => {
      this.eliminatePlayer(loserId, winnerId);
    },
    makeMove: (move: Move) => {
      this.makeMove(move);
    },
    takeOrder: (order: Order) => {
      this.takeOrder(order);
    },
    playerLose: (winner: string | null) => {
      this.playerLose(winner);
    },
    playerWin: () => {
      this.playerWin();
    },
    stopGame: () => {
      this.stopGame();
    },
    onSystemClick: (_event: PointerEvent, _system: System) => {
      this.onSystemClick(_event, _system);
    },
    onLaneClick: (_event: PointerEvent, _lane: Lane) => {
      this.onLaneClick(_event, _lane);
    },
    quit: async () => {
      return this.quit();
    },
    startGame: () => {
      this.startGame();
    },
    gameTick: () => {
      this.gameTick();
    }
  };

  private runningInterval: number | null = null;

  abstract connect(): Promise<void>;

  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }

  getContext() {
    return {
      G: this.state, // TODO: Rename S
      E: this.events,
      C: {
        // TODO: Rename M
        gameState: this.gameState // TODO: return this?
      }
    };
  }

  protected async quit(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  protected playerLose(_winner: string | null) {
    throw new Error('Method not implemented.');
  }

  protected playerWin() {
    throw new Error('Method not implemented.');
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

  protected startGame() {
    this.gameState = GAME_STATUS.PLAYING;
    this.#runGameLoop();
  }

  protected stopGame() {
    this.gameState = GAME_STATUS.FINISHED;
    this.stopGameLoop();
  }

  protected gameTick() {
    this.game.gameTick(this.getContext());
  }

  protected eliminatePlayer(loserId: string, winnerId: string | null) {
    this.game.eliminatePlayer(this.getContext(), loserId, winnerId);
  }

  protected makeMove(move: Move) {
    this.game.moves.makeMove(this.getContext(), move);
  }

  protected takeOrder(order: Order) {
    const move = this.game.utilities.takeOrder(this.getContext(), order);
    if (move) {
      this.events.makeMove(move);
    }
  }

  protected onSystemClick(event: PointerEvent, system: System) {
    this.events.onSystemClick(event, system);
  }

  protected onLaneClick(event: PointerEvent, lane: Lane) {
    this.events.onLaneClick(event, lane);
  }

  #runGameLoop() {
    if (this.gameState !== GAME_STATUS.PLAYING) {
      this.stopGame();
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
}
