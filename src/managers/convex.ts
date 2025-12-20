import { init } from '@paralleldrive/cuid2';
import { ConvexClient } from 'convex/browser';

import { api } from '../../convex/_generated/api';
import { COLORS, NumHumanPlayers, START_PAUSED } from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';
import { trackEvent } from '../utils/logging.ts';

import { GameManager } from './manager.ts';

import type { Player } from '../types';

const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

const createId = init({ length: 5 });

export class ConvexGameManager extends GameManager {
  async connect() {
    this.gameStop();
    this.status = 'WAITING';

    const playerId = (this.playerId =
      localStorage.getItem('starz_playerId') ?? createId());
    const playerName = this.config.playerName;

    localStorage.setItem('starz_playerId', playerId);
    localStorage.setItem('starz_playerName', playerName);

    const score = await client.query(api.leaderboard.getMyBestScore, {
      playerId
    });
    const thisPlayer = this.onPlayerJoin(1, {
      id: playerId,
      name: playerName,
      score: score ?? undefined
    })!;

    this.registerUIEvents();

    if (START_PAUSED) {
      await ui.showStartGame();
    }

    const ctx = this.getContext();
    this.state = this.game.setup(ctx);
    ui.clearMessages();

    // Re-add thisPlayer
    this.onPlayerJoin(1, thisPlayer);
    this.game.assignSystem(this.state, playerId);

    const totalPlayers = NumHumanPlayers + +this.config.numBots;
    for (let i = 2; i <= totalPlayers; i++) {
      const player = this.onPlayerJoin(
        i,
        i === 1 ? { id: playerId, name: playerName } : undefined
      )!;
      this.game.assignSystem(this.state, player.id);
    }

    const name = NumHumanPlayers > 0 ? this.config.playerName : '1';
    this.setupThisPlayer(thisPlayer.id, name);
    ui.setupUI();

    this.gameStart();
    ui.rerender();
  }

  protected gameStart() {
    trackEvent('starz_gamesStarted');
    super.gameStart();

    ui.addMessage(`Game started.`);

    const player = this.state.playerMap.get(this.playerId);
    if (player) ui.addMessage(`You are Player ${player.name}.`);
  }

  protected gameStop() {
    super.gameStop();

    ui.clearSelection();
    ui.rerender();
  }

  private onPlayerJoin(playerIndex: number, player: Partial<Player> = {}) {
    const color = player.color ?? COLORS[playerIndex];
    const playerName = player.name ?? `Bot ${playerIndex}`;

    const id = player.id ?? createId();
    const bot: Bot | undefined =
      playerIndex > NumHumanPlayers
        ? new Bot({ playerIndex, id, name: playerName })
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

  protected async onPlayerWin(winnerId: string, message?: string) {
    if (message) ui.addMessage(message);

    this.game.revealAllSystems(this.state);
    ui.clearSelection();

    let restart = false;
    if (winnerId === this.playerId) {
      trackEvent('starz_gamesWon');
      restart = await ui.showEndGame(`You have conquered The Bubble!`);
    } else {
      trackEvent('starz_gamesLost', { winnerId });
      restart = await ui.showEndGame(
        `You have lost your homeworld! Click to return to lobby.  ESC to spectate.`
      );
    }
    if (restart) this.reload();
  }

  private reload() {
    const newURL = window.location.href.split('#')[0];
    window.history.replaceState(null, '', newURL);
    window.location.reload();
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

  protected addPlayer(player: Partial<Player> & { id: string }) {
    const _player = super.addPlayer({
      color: player.color ?? getRandomColor(),
      ...player
    });

    console.log(`Added player ${_player.name} (${_player.id})`);

    document.documentElement.style.setProperty(
      `--player-${_player.id}`,
      _player.color
    );
    return _player;
  }

  private setupThisPlayer(playerId: string, name?: string) {
    this.playerId = playerId;
    const player = this.state.playerMap.get(playerId)!;
    player.name = name ?? player.name;
    const homeworld = this.game.getPlayersHomeworld(this.state)!;
    this.game.visitSystem(this.state, homeworld);
    ui.centerOnHome();

    if (!player.bot) {
      ui.clearSelection();
      ui.select(homeworld.id);
    }
  }

  private async submitWinLoss(deltaScore: number) {
    const playerId = this.playerId;
    const player = this.state.playerMap.get(this.playerId)!;
    const playerName = player.name;
    const tick = this.tick;

    try {
      await client.mutation(api.leaderboard.submitScore, {
        playerId,
        playerName,
        tick,
        deltaScore
      });
      console.log('Score submitted!');
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  }

  private registerUIEvents() {
    ui.setupDialogs();
    ui.setupKeboardControls();

    this.events.on('PLAYER_WIN', ({ playerId, message }) => {
      this.onPlayerWin(playerId, message);
    });

    this.events.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.onEliminatePlayer(loserId, winnerId);
    });

    this.events.on('PLAYER_QUIT', ({ playerId }) => {
      this.game.eliminatePlayer(this.getContext(), playerId);
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
