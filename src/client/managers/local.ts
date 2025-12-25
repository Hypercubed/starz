import { init } from '@paralleldrive/cuid2';

import { COLORS, NumHumanPlayers, START_PAUSED } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player } from '../types';
import type { AppRootElement } from '../ui/components/app-root.ts';

const createId = init({ length: 5 });

export class LocalGameManager extends GameManager {
  protected appRoot!: AppRootElement;
  protected thisPlayer!: Player;

  mount(appRoot: AppRootElement) {
    this.appRoot = appRoot;
    this.appRoot.gameManager = this;
    this.#registerEvents();
  }

  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    // Create and add this player to make it available during setup
    const thisPlayerPartial = await this.initializePlayer();
    this.thisPlayer = this.addPlayer(thisPlayerPartial);
    this.playerId = this.thisPlayer.id;

    this.events.emit('GAME_INIT', undefined);

    if (START_PAUSED) {
      this.appRoot.showStartDialog();
    } else {
      this.start();
    }
  }

  async start() {
    localStorage.setItem('starz_playerId', this.playerId);
    localStorage.setItem('starz_playerName', this.thisPlayer.name);
    localStorage.setItem(
      'starz_score',
      this.thisPlayer.score?.toString() ?? '0'
    );

    this.gameSetup(this.thisPlayer);
    this.gameStart();
    ui.requestRerender();
  }

  protected gameSetup(player: Partial<Player> & { id: string }) {
    const ctx = this.getFnContext();
    this.state = this.game.setup(ctx);
    ui.clearMessages();

    // Get players name from config in case it changed
    player.name = this.config.playerName;

    // Add this player first
    const thisPlayer = this.onPlayerJoin(1, player);
    this.game.assignSystem(this.state, player.id);

    // Add Bots
    const totalPlayers = NumHumanPlayers + +this.config.numBots;
    for (let i = 2; i <= totalPlayers; i++) {
      const player = this.onPlayerJoin(i)!;
      this.game.assignSystem(this.state, player.id);
    }

    this.setupThisPlayer(thisPlayer.id);

    localStorage.setItem('starz_playerId', thisPlayer.id);
    localStorage.setItem('starz_playerName', thisPlayer.name);
    localStorage.setItem('starz_score', thisPlayer.score.score.toString());
  }

  protected async initializePlayer() {
    const playerId = (this.playerId =
      localStorage.getItem('starz_playerId') ?? createId());
    const playerName =
      localStorage.getItem('starz_playerName') ?? this.config.playerName;
    const score = +(localStorage.getItem('starz_score') ?? 0);

    localStorage.setItem('starz_playerId', playerId);
    localStorage.setItem('starz_playerName', playerName);
    localStorage.setItem('starz_score', score.toString());

    return {
      id: playerId,
      name: playerName,
      score: { score }
    } satisfies Partial<Player>;
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    super.gameStart();

    ui.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId);
    if (player) ui.addMessage(`You are ${player.name}.`);
  }

  protected gameStop() {
    super.gameStop();

    ui.clearSelection();
    ui.requestRerender();
  }

  protected onPlayerJoin(playerIndex: number, player: Partial<Player> = {}) {
    const color = COLORS[playerIndex];
    const botIndex = playerIndex - NumHumanPlayers;
    const playerName = player.name ?? `Bot ${botIndex}`;

    const id = createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers
        ? new Bot({ playerIndex: botIndex, id, name: playerName })
        : undefined;
    return this.addPlayer({ id, name: playerName, bot, color, ...player });
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

  protected showEndGame(message: string) {
    return this.appRoot.showEndGame(message);
  }

  async quit() {
    const ret = await this.showEndGame('Are you sure you want to quit?');
    if (ret) {
      this.game.eliminatePlayer(this.getFnContext(), this.playerId);
    }
  }

  protected async onPlayerWin(winnerId: string, message?: string) {
    if (message) ui.addMessage(message);

    this.game.revealAllSystems(this.state);
    ui.clearSelection();

    let restart = false;
    if (winnerId === this.playerId) {
      trackEvent('starz_gamesWon');
      restart = await this.showEndGame(`You have conquered The Bubble!`);
    } else {
      trackEvent('starz_gamesLost', { winnerId });
      restart = await this.showEndGame(
        `You have lost your homeworld! Click to return to lobby.  ESC to spectate.`
      );
    }

    if (restart) this.restart();
  }

  protected restart() {
    this.stopGameLoop();
    ui.clearSelection();

    this.tick = 0;
    this.state = this.game.initalState();
    this.connect();
  }

  protected onEliminatePlayer(loserId: string, winnerId: string | null) {
    const loser = this.state.playerMap.get(loserId)!;
    const winner = this.state.playerMap.get(winnerId as any);

    const message =
      winnerId === null
        ? `${loser.name} has been eliminated!`
        : `${winner!.name} has eliminated ${loser.name}!`;

    ui.addMessage(message);

    if (loserId === this.playerId) {
      this.submitWinLoss(-1);
      this.onPlayerWin(winnerId!);
    } else if (winnerId === this.playerId) {
      this.submitWinLoss(1);
    }
  }

  protected async submitWinLoss(deltaScore: number) {
    const score = +(localStorage.getItem('starz_score') ?? 0) + deltaScore;
    localStorage.setItem('starz_score', score.toString());
  }

  protected addPlayer(player: Partial<Player> & { id: string }): Player {
    const _player = super.addPlayer({
      color: player.color ?? getRandomColor(),
      ...player
    });

    document.documentElement.style.setProperty(
      `--player-${_player.id}`,
      _player.color
    );
    return _player;
  }

  protected setupThisPlayer(playerId: string) {
    this.playerId = playerId;
    const player = this.state.playerMap.get(playerId)!;

    const homeworld = this.game.getPlayersHomeworld(this.state)!;
    this.game.visitSystem(this.state, homeworld);
    ui.centerOnHome();

    if (!player.bot) {
      ui.clearSelection();
      ui.select(homeworld.id);
    }
  }

  #registerEvents() {
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

export { GameManager };
