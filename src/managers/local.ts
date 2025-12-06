import { init } from '@paralleldrive/cuid2';

import {
  COLORS,
  NumHumanPlayers,
  START_PAUSED
} from '../constants.ts';

import * as renderer from '../ui/index.ts';

import { Bot } from '../game/bots.ts';
import { GameManager } from './manager.ts';
import { GAME_STATUS } from './types.ts';
import { trackEvent } from '../utils/logging.ts';
import type { Lane, System } from '../types.ts';
import { assignSystem } from '../game/generate.ts';
import { clearSelection, select } from '../ui/selection.ts';

const createId = init({ length: 5 });

export class LocalGameManager extends GameManager {
  constructor() {
    super();
    this.registerUIEvents();
  }

  async connect() {
    this.stopGame();
    this.gameState = GAME_STATUS.WAITING;

    if (START_PAUSED) {
      await renderer.showStartGame();
    }

    const ctx = this.getContext();
    this.state = this.game.setup(ctx);

    const totalPlayers = NumHumanPlayers + +this.config.numBots;

    for (let i = 1; i <= totalPlayers; i++) {
      this.playerJoin(i);
      assignSystem(this.state, this.state.players[i - 1].id);
    }
    
    const thisPlayer = this.state.players[0];
    this.setupThisPlayer(thisPlayer.id, this.config.playerName);
    renderer.setupUI(this.getContext());

    this.startGame();
    renderer.rerender(this.getContext());
  }

  protected startGame() {
    trackEvent('starz_gamesStarted');
    this.game.addMessage(this.state, `Game started.`);

    const player = this.state.playerMap.get(this.state.thisPlayerId!);
    if (player) {
      this.game.addMessage(this.state, `You are Player ${player.name}.`);
    }

    super.startGame();
  }

  protected stopGame() {
    super.stopGame();

    clearSelection();
    renderer.rerender(this.getContext());
  }

  protected gameTick() {
    super.gameTick();
    this.game.checkVictory(this.getContext());

    renderer.rerender(this.getContext());
    renderer.updateUI(this.state);
  }

  private playerJoin(playerIndex: number) {
    const color = COLORS[playerIndex];
    const name = /* bot?.name ?? */ `${playerIndex}`;

    const id = createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot({ playerIndex, id }) : undefined;
    this.addPlayer(name, id, bot, color);
  }

  pauseToggle() {
    if (this.gameState === GAME_STATUS.PAUSED) {
      this.gameState = GAME_STATUS.PLAYING;
      super.startGameLoop();
    } else if (this.gameState === GAME_STATUS.PLAYING) {
      this.gameState = GAME_STATUS.PAUSED;
      super.stopGameLoop();
    }
  }

  protected playerWin() {
    this.stopGame();

    this.game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesWon');
    return renderer.showEndGame(`You have conquered The Bubble!`);
  }

  protected quit() {
    return renderer.showEndGame('Quit?');
  }

  protected eliminatePlayer(loserId: string, winnerId: string | null) {
    const loser = this.state.playerMap.get(loserId)!;
    const winner = this.state.playerMap.get(winnerId as any);

    const message =
      winnerId === null
        ? `Player ${loser.name} has been eliminated!`
        : `Player ${winner!.name} has eliminated Player ${loser.name}!`;

    this.game.addMessage(this.state, message);
    super.eliminatePlayer(loserId, winnerId);
  }

  protected playerLose(winner: string | null) {
    this.stopGame();

    this.game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesLost', { winner });
    return renderer.showEndGame(`You have lost your homeworld! Game Over.`);
  }

  protected addPlayer(
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

  protected onSystemClick(event: PointerEvent, system: System) {
    renderer.onClickSystem(event, this.getContext(), system);
    renderer.rerender(this.getContext());
  }

  protected onLaneClick(event: PointerEvent, lane: Lane) {
    renderer.onClickLane(event, this.getContext(), lane);
    renderer.rerender(this.getContext());
  }

  private setupThisPlayer(playerId: string, name?: string) {
    this.state.thisPlayerId = playerId;
    const player = this.state.playerMap.get(playerId)!;
    if (name) {
      player.name = name;
    }
    const homeworld = this.game.getPlayersHomeworld(this.state)!;
    this.game.revealSystem(this.state, homeworld);
    renderer.centerOnHome(this.getContext());
    clearSelection();
    select(homeworld.id);
  }

  private registerUIEvents() {
    renderer.setupDialogs();
    renderer.setupKeboardControls();
  }
}
