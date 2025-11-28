import { checkVictory, gameTick, setupGame } from '../core/engine';
import { addMessage, state } from '../game/state';
import { PLAYER, TICK_DURATION_MS } from '../core/constants';
import { setupKeboardControls } from '../input/controls';
import { setupDialogs } from '../render/ui';
import { trackEvent } from '../utils/logging';
import { rerender } from '../render/render';
import type { Move } from '../types';
import { moveShips } from '../game/actions';

export const GAME_STATE = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
  PAUSED: 'PAUSED'
} as const;

type GameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];

export abstract class GameManager {
  gameState: GameState = GAME_STATE.WAITING;

  protected runningInterval: number | null = null;

  constructor() {
    this.registerEvents();
  }

  abstract connect(): Promise<void>;

  setupGame() {
    this.stopGame();
    setupGame();
  }

  startGame() {
    trackEvent('starz_gamesStarted');
    addMessage(`Game started. You are Player ${PLAYER}.`);

    this.gameState = GAME_STATE.PLAYING;
    this.runGameLoop();
  }

  stopGame() {
    this.gameState = GAME_STATE.FINISHED;
    this.stopGameLoop();

    state.selectedSystems = [];
    state.lastSelectedSystem = null;
    rerender();
  }

  makeMove(move: Move) {
    const from = state.world.systems[move.fromIndex];
    const to = state.world.systems[move.toIndex];
    moveShips(from, to, move.ships);
    from.lastMove = move;
    rerender();
  }

  protected registerEvents() {
    setupDialogs();
    setupKeboardControls();
  }

  protected runGameLoop() {
    if (this.gameState !== GAME_STATE.PLAYING) {
      this.stopGame();
      return;
    }

    this.stopGameLoop();

    gameTick();
    checkVictory();

    this.runningInterval = setTimeout(
      () => this.runGameLoop(),
      TICK_DURATION_MS / state.timeScale
    );
  }

  protected stopGameLoop() {
    if (this.runningInterval) {
      clearTimeout(this.runningInterval);
      this.runningInterval = null;
    }
  }
}
