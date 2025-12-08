import { init } from '@paralleldrive/cuid2';

import { COLORS, NumHumanPlayers, START_PAUSED } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as renderer from '../ui/index.ts';
import { clearSelection, select } from '../ui/selection.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

const createId = init({ length: 5 });

export class LocalGameManager extends GameManager {
  constructor() {
    super();
    this.registerUIEvents();
  }

  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    if (START_PAUSED) {
      await renderer.showStartGame();
    }

    const ctx = this.getContext();
    this.state = this.game.setup(ctx);

    const totalPlayers = NumHumanPlayers + +this.config.numBots;

    for (let i = 1; i <= totalPlayers; i++) {
      this.onPlayerJoin(i);
      this.game.assignSystem(this.state, this.state.players[i - 1].id);
    }

    const thisPlayer = this.state.players[0];

    const name = NumHumanPlayers > 0 ? this.config.playerName : '1';
    this.setupThisPlayer(thisPlayer.id, name);
    renderer.setupUI();

    this.gameStart();
    renderer.rerender();
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    this.game.addMessage(this.state, `Game started.`);

    const player = this.state.playerMap.get(this.playerId);
    if (player) {
      this.game.addMessage(this.state, `You are Player ${player.name}.`);
    }

    super.gameStart();
  }

  protected gameStop() {
    super.gameStop();

    clearSelection();
    renderer.rerender();
  }

  public gameTick() {
    super.gameTick();
    this.game.checkVictory(this.getContext());
  }

  private onPlayerJoin(playerIndex: number) {
    const color = COLORS[playerIndex];
    const name = /* bot?.name ?? */ `${playerIndex}`;

    const id = createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers ? new Bot({ playerIndex, id }) : undefined;
    this.addPlayer(name, id, bot, color);
  }

  protected onPauseToggle() {
    if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      super.startGameLoop();
    } else if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      super.stopGameLoop();
    }
  }

  protected onThisPlayerWin() {
    this.gameStop();

    this.game.revealAllSystems(this.state);
    clearSelection();

    trackEvent('starz_gamesWon');
    return renderer.showEndGame(`You have conquered The Bubble!`);
  }

  protected async onQuit() {
    return renderer.showEndGame('Quit?');
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    const loser = this.state.playerMap.get(loserId)!;
    const winner = this.state.playerMap.get(winnerId as any);

    const message =
      winnerId === null
        ? `Player ${loser.name} has been eliminated!`
        : `Player ${winner!.name} has eliminated Player ${loser.name}!`;

    this.game.addMessage(this.state, message);
    super.onEliminatePlayer(loserId, winnerId);
  }

  protected onThisPlayerLose(winner: string | null) {
    this.gameStop();

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

    player.color ??= getRandomColor();

    console.log(`Added player ${player.name} (${player.id})`);

    document.documentElement.style.setProperty(`--player-${player.id}`, color);
    return player;
  }

  private setupThisPlayer(playerId: string, name?: string) {
    this.playerId = playerId;
    const player = this.state.playerMap.get(playerId)!;
    if (name) {
      player.name = name;
    }
    const homeworld = this.game.getPlayersHomeworld(this.state)!;
    this.game.revealSystem(this.state, homeworld);
    renderer.centerOnHome();

    if (!player.bot) {
      clearSelection();
      select(homeworld.id);
    }
  }

  private registerUIEvents() {
    renderer.setupDialogs();
    renderer.setupKeboardControls();

    this.events.on('UI_QUIT', () => {
      this.onQuit();
    });

    this.events.on('PLAYER_LOSE', (move) => {
      this.onThisPlayerLose(move.winnerId);
    });

    this.events.on('PLAYER_WIN', () => {
      this.onThisPlayerWin();
    });

    this.events.on('UI_PAUSE_TOGGLE', () => {
      this.onPauseToggle();
    });
  }
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
