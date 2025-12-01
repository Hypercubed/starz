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
import {
  type Lane,
  type Move,
  type Order,
  type Player,
  type System
} from '../types';
import { eliminatePlayer, moveShips, orderToMove } from '../game/actions';
import type { Bot } from '../game/bots';
import { GAME_STATE, type GameState } from './types';

export abstract class GameManager {
  gameState: GameState = GAME_STATE.WAITING;

  protected runningInterval: number | null = null;

  constructor() {
    this.#registerEvents();
  }

  abstract connect(): Promise<void>;

  protected setupGame() {
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

    if (bot) {
      bot.id = player.id;
    }

    document.documentElement.style.setProperty(`--player-${player.id}`, color);
  }

  protected setupThisPlayer(playerId: string) {
    state.thisPlayerId = playerId;
    const homeworld = getPlayersHomeworld()!;
    revealSystem(homeworld);
    centerOnHome();
    state.selectedSystems.clear();
    state.selectedSystems.add(homeworld.id);
    state.lastSelectedSystem = homeworld.id;
  }

  startGame() {
    trackEvent('starz_gamesStarted');
    addMessage(`Game started.`);

    const player = state.playerMap.get(state.thisPlayerId!);
    if (player) {
      addMessage(`You are Player ${player.name}.`);
    }

    this.gameState = GAME_STATE.PLAYING;
    this.runGameLoop();
  }

  stopGame() {
    this.gameState = GAME_STATE.FINISHED;
    this.stopGameLoop();

    state.selectedSystems.clear();
    state.lastSelectedSystem = null;
    rerender();
  }

  takeOrder(order: Order) {
    const move = orderToMove(order);
    if (move) {
      this.makeMove(move);
    }
  }

  makeMove(move: Move) {
    const from = state.world.systemMap.get(move.fromId)!;
    const to = state.world.systemMap.get(move.toId)!;
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
    state.selectedSystems.clear();
    state.lastSelectedSystem = null;

    trackEvent('starz_gamesWon');
    return showEndGame(`You have conquered The Bubble!`);
  }

  quit() {
    return showEndGame('Quit?');
  }

  eliminatePlayer(loserId: string, winnerId: string) {
    const loser = state.playerMap.get(loserId)!;
    const winner = state.playerMap.get(winnerId);

    const message =
      winnerId === null
        ? `Player ${loser.name} has been eliminated!`
        : `Player ${winner!.name} has eliminated Player ${loser.name}!`;

    addMessage(message);
    eliminatePlayer(loserId, winnerId);
  }

  playerLose(winner: string | null) {
    this.stopGame();
    this.gameState = GAME_STATE.FINISHED;

    state.world.systems.forEach(revealSystem);
    state.lastSelectedSystem = null;
    state.selectedSystems.clear();

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
