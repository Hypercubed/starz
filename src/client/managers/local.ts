import {
  MAX_BOTS,
  MAX_PLAYERS,
  START_PAUSED,
  EVENT_TRACKING_ENABLED
} from '../constants.ts';
import { Bot } from '../game/bots.ts';
import * as ui from '../ui/index.ts';

import { GameManager } from './classes/manager.ts';

import type { Player } from '../types';
import type { AppRootElement } from '../ui/components/app-root.ts';
import { getUniqueName } from '../utils/names.ts';
import { getUniqueColor } from '../utils/colors.ts';
import { createId, createPlayerId } from '../utils/ids.ts';
import type { GameEventsMap } from '../game/events.ts';
import {
  createEvent,
  type EventBusEmit,
  type EventBusOn
} from './classes/event-bus.ts';
import type { GameConfig } from '../game/types';
import type { ManagerFeatures } from './types';

const createManagerEvents = () => {
  return {
    PLAYER_JOINED: createEvent<{ player: Player }>(),
    PLAYER_REMOVED: createEvent<{ playerId: string }>(),
    ADD_MESSAGE: createEvent<string>(),
    CLEAR_MESSAGES: createEvent<void>(),
    TRACK: createEvent<{ eventName: string; meta?: any }>()
  };
};

export type LocalGameManagerEvents = GameEventsMap &
  ReturnType<typeof createManagerEvents>;

export class LocalGameManager extends GameManager {
  readonly name: string = 'LocalGameManager';

  declare protected events: LocalGameManagerEvents;
  declare on: EventBusOn<LocalGameManagerEvents>;
  declare emit: EventBusEmit<LocalGameManagerEvents>;

  protected appRoot!: AppRootElement;
  protected thisPlayer!: Player;

  constructor() {
    super();

    this.addEvents(createManagerEvents());
  }

  readonly features: ManagerFeatures = {
    multiplayer: false,
    leaderboard: false
  };

  getPlayer(): Player | null {
    return this.thisPlayer;
  }

  isMultiplayer() {
    return false;
  }

  // Mount the manager to the UI
  mount(appRoot: AppRootElement) {
    this.appRoot = appRoot;
    this.appRoot.gameManager = this;
    this.#registerEvents();
  }

  // Connect to the game (setup player, etc)
  async connect() {
    this.gameStop();
    this.status = 'INIT';

    // Create and add this player to make it available during setup
    const player = await this.initializePlayer();
    this.thisPlayer = this.onPlayerJoin(player);
    this.playerId = this.thisPlayer.id;

    this.events.GAME_INIT.dispatch();

    if (START_PAUSED) {
      this.appRoot.showStartDialog();
    } else {
      this.start();
    }
  }

  async waiting() {
    this.status = 'WAITING';
  }

  async start(config?: Partial<GameConfig>) {
    if (this.status !== 'INIT' && this.status !== 'WAITING') return;

    this.setConfig(config ?? {});

    this.savePlayerData();
    await this.gameSetup();
    this.gameStart();
    ui.requestRerender();
  }

  private savePlayerData() {
    const player = this.state.playerMap.get(this.playerId);
    if (!player) return;

    localStorage.setItem('starz_playerId', player.id);
    localStorage.setItem('starz_playerName', player.name);
    localStorage.setItem('starz_score', player.score?.score?.toString() ?? '0');
  }

  protected async gameSetup() {
    const players = Array.from(this.state.playerMap.values());
    console.log('Setting up game with players:', players);

    this.state = this.game.setup(this.getFnContext());
    this.events.CLEAR_MESSAGES.dispatch();

    // Ensure players are added, IDs may have changed
    this.state.playerMap.clear();
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      this.onPlayerJoin(p);
      this.game.assignSystem(this.state, p.id);
    }

    this.thisPlayer = this.state.playerMap.get(this.playerId)!;
    this.setupThisPlayer(this.playerId);
  }

  protected async initializePlayer(): Promise<
    Partial<Player> & { id: string; name: string; score: { score: number } }
  > {
    const playerId = (this.playerId =
      localStorage.getItem('starz_playerId') ?? createPlayerId());
    const playerName =
      localStorage.getItem('starz_playerName') ?? this.config.playerName;
    const score = +(localStorage.getItem('starz_score') ?? 0);

    return {
      id: playerId,
      name: playerName,
      score: { score }
    };
  }

  protected gameStart() {
    if (this.status !== 'INIT' && this.status !== 'WAITING') return;

    this.events.TRACK.dispatch({ eventName: 'starz_gamesStarted' });
    super.gameStart();

    this.events.ADD_MESSAGE.dispatch(`Game started.`);

    const player = this.state.playerMap.get(this.playerId);
    if (player) this.events.ADD_MESSAGE.dispatch(`You are ${player.name}.`);
  }

  protected gameStop() {
    super.gameStop();

    ui.clearSelection();
    ui.requestRerender();
  }

  protected pauseToggle() {
    if (this.isMultiplayer()) return;

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
    if (message) this.events.ADD_MESSAGE.dispatch(message);

    this.game.revealAllSystems(this.state);
    ui.clearSelection();

    let restart = false;
    if (winnerId === this.playerId) {
      this.events.TRACK.dispatch({
        eventName: 'starz_gamesWon',
        meta: { winnerId }
      });
      restart = await this.showEndGame(`You have conquered The Bubble!`);
    } else {
      this.events.TRACK.dispatch({
        eventName: 'starz_gamesLost',
        meta: { winnerId }
      });
      restart = await this.showEndGame(
        `You have lost your homeworld! Click to return to lobby.`
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

  onEliminatePlayer(loserId: string, winnerId: string | null) {
    const loser = this.state.playerMap.get(loserId)!;
    const winner = this.state.playerMap.get(winnerId as any);

    const message =
      winnerId === null
        ? `${loser.name} has been eliminated!`
        : `${winner!.name} has eliminated ${loser.name}!`;

    this.events.ADD_MESSAGE.dispatch(message);

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

  async addBot() {
    if (this.state.playerMap.size >= MAX_PLAYERS) return;

    const players = Array.from(this.state.playerMap.values());
    const bots = players.filter((p) => p.bot);
    if (bots.length >= MAX_BOTS) return;

    const id = createId();
    const name = getUniqueName(players.map((p) => p.name));
    const bot = new Bot({ id }); // Why does BOT need it's name?
    return this.onPlayerJoin({ id, name, bot })!;
  }

  removeBot(id: string) {
    const player = this.state.playerMap.get(id);
    if (player?.bot) this.onPlayerLeave(id);
  }

  onPlayerJoin(player: Partial<Player>): Player {
    if (player.id && this.state.playerMap.has(player.id)) {
      return this.state.playerMap.get(player.id)!;
    }

    const players = Array.from(this.state.playerMap.values());

    const id = player.id ?? createPlayerId();
    const name = player.name ?? getUniqueName(players.map((p) => p.name));
    const color = player.color ?? getUniqueColor(players.map((p) => p.color));
    const bot = player.bot ? new Bot({ id }) : undefined;

    const newPlayer = super.addPlayer({ id, ...player, bot, name, color });

    document.documentElement.style.setProperty(
      `--player-${newPlayer.id}`,
      newPlayer.color
    );

    this.events.PLAYER_JOINED.dispatch({ player: newPlayer });
    return newPlayer;
  }

  onPlayerLeave(playerId: string) {
    this.state.playerMap.delete(playerId);
    this.events.PLAYER_REMOVED.dispatch({ playerId });
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

    this.savePlayerData();
  }

  updatePlayerName(newName: string) {
    const player = this.state.playerMap.get(this.playerId);
    if (!player) return;

    player.name = newName;
    this.events.PLAYER_UPDATED.dispatch({ playerId: player.id });

    localStorage.setItem('starz_playerName', player.name);
  }

  #registerEvents() {
    this.events.PLAYER_WON.add(({ playerId, message }) => {
      this.onPlayerWin(playerId, message);
    });

    this.on('PLAYER_ELIMINATED', ({ loserId, winnerId }) => {
      this.onEliminatePlayer(loserId, winnerId);
    });

    if (EVENT_TRACKING_ENABLED) {
      this.on('TRACK', ({ eventName, meta }) => {
        if (window && window.sa_event) {
          try {
            window.sa_event(eventName, {
              tick: this.tick,
              ...meta
            });
          } catch (e) {
            console.error('Error tracking event:', e);
          }
        }
      });
    }
  }
}
