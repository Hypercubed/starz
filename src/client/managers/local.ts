import { nanoid } from 'nanoid';

import { COLORS, MAX_PLAYERS, START_PAUSED } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player } from '../types';
import type { AppRootElement } from '../ui/components/app-root.ts';

const createId = () => nanoid(5);

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

  addBot() {
    const index = this.state.playerMap.size;
    if (index >= MAX_PLAYERS) return;

    const id = createId();
    const name = `Bot ${index}`;
    const bot = new Bot({ id, name });
    return this.onPlayerJoin(index, { id, name, bot })!;
  }

  protected gameSetup(player: Partial<Player> & { id: string }) {
    const ctx = this.getFnContext();

    const players = Array.from(ctx.S.playerMap.values());

    this.state = this.game.setup(ctx);
    ui.clearMessages();

    // Get players name from config in case it changed
    player.name = this.config.playerName;

    // Ensure players are added, IDs may have changed
    console.log('Starting game with players:', players);

    this.state.playerMap.clear();
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      this.onPlayerJoin(i, p);
      this.game.assignSystem(this.state, p.id);

      console.log(`Player ${p.name} assigned to homeworld.`, p);
    }

    const thisPlayer = this.state.playerMap.get(player.id)!;
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
    const playerName = player.name ?? `Anonymous Player`;

    const id = createId();
    return this.addPlayer({ id, name: playerName, color, ...player });
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

    this.events.emit('PLAYER_ADDED', { player: _player });

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
