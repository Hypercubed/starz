import { gameTick } from '../core/engine.ts';
import { addPlayer, state } from '../game/state.ts';
import { TICK_DURATION_MS } from '../core/constants.ts';
import {
  type Lane,
  type Move,
  type Order,
  type Player,
  type System
} from '../types.ts';
import { eliminatePlayer, moveShips, orderToMove } from '../game/actions.ts';
import type { Bot } from '../game/bots.ts';
import { GAME_STATE, type GameState } from './types.ts';
import { debugLog } from '../utils/logging.ts';

export abstract class GameManager {
  gameState: GameState = GAME_STATE.WAITING;

  protected runningInterval: number | null = null;

  abstract connect(): Promise<void>;

  quit() {
    throw new Error('Method not implemented.');
  }

  playerWin() {
    // Override in subclass if needed
  }

  playerLose(_winner: string | null) {
    // Override in subclass if needed
  }

  eliminatePlayer(loserId: string, winnerId: string | null) {
    eliminatePlayer(loserId, winnerId);
  }

  onSystemClick(_event: PointerEvent, _system: System) {
    // Override in subclass if needed
  }

  onLaneClick(_event: PointerEvent, _lane: Lane) {
    // Override in subclass if needed
  }

  addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ): Player | undefined {
    if (state.playerMap.has(playerId)) return;

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
    addPlayer(player);

    return player;
  }

  startGame() {
    this.gameState = GAME_STATE.PLAYING;
    this.#runGameLoop();
  }

  stopGame() {
    this.gameState = GAME_STATE.FINISHED;
    this.stopGameLoop();
  }

  takeOrder(order: Order) {
    if (order.playerId === state.thisPlayerId) {
      debugLog(`player order: ${JSON.stringify(order)}`);
    }
    const move = orderToMove(order);
    if (move) {
      this.makeMove(move);
    }
  }

  makeMove(move: Move) {
    if (move.playerId === state.thisPlayerId) {
      debugLog(`player move: ${JSON.stringify(move)}`);
    }
    const from = state.world.systemMap.get(move.fromId)!;
    const to = state.world.systemMap.get(move.toId)!;
    moveShips(from, to, move.ships);
    from.lastMove = move;
  }

  gameTick() {
    gameTick();
  }

  #runGameLoop() {
    if (this.gameState !== GAME_STATE.PLAYING) {
      this.stopGame();
      return;
    }

    this.stopGameLoop();
    this.gameTick();

    this.runningInterval = setTimeout(
      () => this.#runGameLoop(),
      TICK_DURATION_MS / state.timeScale
    );
  }

  startGameLoop() {
    this.#runGameLoop();
  }

  stopGameLoop() {
    if (this.runningInterval) {
      clearTimeout(this.runningInterval);
      this.runningInterval = null;
    }
  }
}
