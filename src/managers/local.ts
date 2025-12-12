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
    renderer.clearMessages();

    const totalPlayers = NumHumanPlayers + +this.config.numBots;

    for (let i = 1; i <= totalPlayers; i++) {
      const player = this.onPlayerJoin(i)!;
      if (i === 1) this.playerId = player.id;
      this.game.assignSystem(this.state, player.id);
    }

    const thisPlayer = this.state.playerMap.get(this.playerId)!;

    const name = NumHumanPlayers > 0 ? this.config.playerName : '1';
    this.setupThisPlayer(thisPlayer.id, name);
    renderer.setupUI();

    this.gameStart();
    renderer.rerender();
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    super.gameStart();

    renderer.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId);
    if (player) {
      renderer.addMessage(`You are Player ${player.name}.`);
    }
  }

  protected gameStop() {
    super.gameStop();

    clearSelection();
    renderer.rerender();
  }

  private onPlayerJoin(playerIndex: number) {
    const color = COLORS[playerIndex];
    const name = /* bot?.name ?? */ `Bot ${playerIndex}`;

    const id = createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers
        ? new Bot({ playerIndex, id, name })
        : undefined;
    return this.addPlayer(name, id, bot, color);
  }

  protected pauseToggle() {
    if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      super.startGameLoop();
    } else if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      super.stopGameLoop();
    }
  }

  protected onPlayerWin(winnerId: string, message?: string) {
    console.log('onPlayerWin', { winnerId, message }, this.playerId);
    if (message) {
      renderer.addMessage(message);
    }

    this.game.revealAllSystems(this.state);
    clearSelection();

    if (winnerId === this.playerId) {
      trackEvent('starz_gamesWon');
      return renderer.showEndGame(`You have conquered The Bubble!`);
    } else {
      trackEvent('starz_gamesLost', { winnerId });
      return renderer.showEndGame(`You have lost your homeworld! Game Over.`);
    }
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    const loser = this.state.playerMap.get(loserId)!;
    const winner = this.state.playerMap.get(winnerId as any);

    const message =
      winnerId === null
        ? `${loser.name} has been eliminated!`
        : `${winner!.name} has eliminated ${loser.name}!`;

    renderer.addMessage(message);

    if (winnerId === this.playerId) {
      return this.onPlayerWin(winnerId);
    }

    if (loserId === this.playerId) {
      this.onPlayerWin(winnerId!);
    }
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

    this.events.on('PLAYER_WIN', ({ playerId, message }) => {
      this.onPlayerWin(playerId, message);
    });

    this.events.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.onEliminatePlayer(loserId, winnerId);
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
