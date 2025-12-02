import { init } from '@paralleldrive/cuid2';
import {
  COLORS,
  NumBots,
  NumHumanPlayers,
  START_PAUSED
} from '../core/constants.ts';
import { Bot } from '../game/bots.ts';
import { assignSystem, generateMap } from '../game/generate.ts';
import {
  addMessage,
  getPlayersHomeworld,
  resetState,
  revealSystem,
  state
} from '../game/state.ts';
import { centerOnHome, drawMap, rerender } from '../render/render.ts';
import {
  setupDialogs,
  showEndGame,
  showStartGame,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox,
  updateUI
} from '../render/ui.ts';
import { GameManager } from './manager.ts';
import { GAME_STATE } from './types.ts';
import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from '../input/controls.ts';
import { trackEvent } from '../utils/logging.ts';
import type { Lane, System } from '../types.ts';
import { checkVictory } from '../core/engine.ts';

const createId = init({ length: 5 });

export class LocalGameManager extends GameManager {
  constructor() {
    super();
    this.#registerUIEvents();
  }

  async connect() {
    this.stopGame();
    this.gameState = GAME_STATE.WAITING;

    resetState();
    generateMap();

    const totalPlayers = NumHumanPlayers + NumBots;

    for (let i = 1; i <= totalPlayers; i++) {
      this.#playerJoin(i);
      assignSystem(state.players[i - 1].id);
    }

    const thisPlayer = state.players[0];

    this.setupThisPlayer(thisPlayer.id);
    this.setupUI();

    if (START_PAUSED) {
      showStartGame();
    } else {
      super.startGame();
    }

    rerender();
  }

  startGame() {
    trackEvent('starz_gamesStarted');
    addMessage(`Game started.`);

    const player = state.playerMap.get(state.thisPlayerId!);
    if (player) {
      addMessage(`You are Player ${player.name}.`);
    }

    super.startGame();
  }

  stopGame() {
    super.stopGame();

    state.selectedSystems.clear();
    state.lastSelectedSystem = null;
    rerender();
  }

  gameTick() {
    super.gameTick();
    checkVictory();

    rerender();
    updateUI();
  }

  #playerJoin(playerIndex: number) {
    const color = COLORS[playerIndex];
    const name = /* bot?.name ?? */ `${playerIndex}`;

    const id = createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot({ playerIndex, id }) : undefined;
    this.addPlayer(name, id, bot, color);
  }

  pauseToggle() {
    if (this.gameState === GAME_STATE.PAUSED) {
      this.gameState = GAME_STATE.PLAYING;
      super.startGameLoop();
    } else if (this.gameState === GAME_STATE.PLAYING) {
      this.gameState = GAME_STATE.PAUSED;
      super.stopGameLoop();
    }
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
    super.eliminatePlayer(loserId, winnerId);
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

  onSystemClick(event: PointerEvent, system: System) {
    onClickSystem(event, system);
    rerender();
  }

  onLaneClick(event: PointerEvent, lane: Lane) {
    onClickLane(event, lane);
    rerender();
  }

  addPlayer(
    name: string,
    playerId: string,
    bot: Bot | undefined,
    color: string
  ) {
    const player = super.addPlayer(name, playerId, bot, color);
    if (!player) return;

    document.documentElement.style.setProperty(`--player-${player.id}`, color);
    return player;
  }

  setupThisPlayer(playerId: string) {
    state.thisPlayerId = playerId;
    const homeworld = getPlayersHomeworld()!;
    revealSystem(homeworld);
    centerOnHome();
    state.selectedSystems.clear();
    state.selectedSystems.add(homeworld.id);
    state.lastSelectedSystem = homeworld.id;
  }

  #registerUIEvents() {
    setupDialogs();
    setupKeboardControls();
  }

  setupUI() {
    drawMap();
    updateInfoBox();
    updateLeaderbox();
    updateMessageBox();
  }
}
