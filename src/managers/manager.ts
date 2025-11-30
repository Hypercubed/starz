import { checkVictory, gameTick } from '../core/engine';
import {
  addMessage,
  addPlayer,
  getPlayersHomeworld,
  revealSystem,
  state
} from '../game/state';
import { TICK_DURATION_MS } from '../core/constants';
import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from '../input/controls';
import {
  setupDialogs,
  showEndGame,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox
} from '../render/ui';
import { trackEvent } from '../utils/logging';
import { centerOnHome, drawMap, rerender } from '../render/render';
import type { Lane, Move, Player, System } from '../types';
import { moveShips } from '../game/actions';
import type { Bot } from '../game/bots';
import { GAME_STATE, type GameState } from './types';

export abstract class GameManager {
  gameState: GameState = GAME_STATE.WAITING;

  protected runningInterval: number | null = null;

  constructor() {
    this.#registerEvents();
  }

  abstract connect(): Promise<void>;

  setupGame() {
    drawMap();
    updateInfoBox();
    updateLeaderbox();
    updateMessageBox();
  }

  addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ) {
    const player = {
      name,
      id: playerId,
      bot,
      stats: { playerId: playerId, systems: 0, ships: 0, homeworld: 0 },
      color,
      visitedSystems: new Set<string>(),
      revealedSystems: new Set<string>()
    } satisfies Player;
    addPlayer(player);

    if (bot) {
      bot.id = player.id;
    }

    document.documentElement.style.setProperty(`--player-${player.id}`, color);
  }

  setupThisPlayer(playerId: string) {
    state.thisPlayerId = playerId;
    const homeworld = getPlayersHomeworld()!;
    revealSystem(homeworld);
    centerOnHome();
    state.selectedSystems = [homeworld];
    state.lastSelectedSystem = homeworld;
  }

  startGame() {
    trackEvent('starz_gamesStarted');
    addMessage(`Game started.`);

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
    const from = state.world.systems.find((s) => s.id === move.fromId)!;
    const to = state.world.systems.find((s) => s.id === move.toId)!;
    moveShips(from, to, move.ships);
    from.lastMove = move;
  }

  onSystemClick(event: PointerEvent, system: System) {
    onClickSystem(event, system);
    rerender();
  }

  onLaneClick(event: PointerEvent, lane: Lane) {
    onClickLane(event, lane);
    rerender();
  }

  playerWin() {
    this.stopGame();
    this.gameState = GAME_STATE.FINISHED;

    state.world.systems.forEach(revealSystem);
    state.lastSelectedSystem = null;
    state.selectedSystems = [];

    trackEvent('starz_gamesWon');
    return showEndGame(`You have conquered The Bubble!`);
  }

  quit() {
    return showEndGame('Quit?');
  }

  playerLose(winner: string) {
    this.stopGame();
    this.gameState = GAME_STATE.FINISHED;

    state.world.systems.forEach(revealSystem);
    state.lastSelectedSystem = null;
    state.selectedSystems = [];

    trackEvent('starz_gamesLost', { winner });
    return showEndGame(`You have lost your homeworld! Game Over.`);
  }

  #registerEvents() {
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
