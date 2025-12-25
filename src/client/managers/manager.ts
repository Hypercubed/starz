import { EventBus } from '../classes/EventBus.ts';
import { DEV_MODE, TICK_DURATION_MS } from '../constants.ts';
import * as game from '../game/index.ts';

import type { FnContext, GameContext, GameStatus } from './types';
import type { GameConfig, GameEventMap, GameState, Order } from '../game/types';
import type { Player } from '../types';

export abstract class GameManager {
  public events = new EventBus<GameEventMap>();

  protected game = game;
  protected state = game.initalState();
  protected config = game.defaultConfig();
  protected tick = 0;

  protected status: GameStatus = 'WAITING';
  protected playerId!: string;

  constructor() {
    this.#registerEventListeners();
  }

  private runningInterval: number | null = null;

  abstract connect(): Promise<void>;
  abstract start(): Promise<void>;
  abstract quit(): Promise<void>;

  getState(): Readonly<GameState> {
    return DEV_MODE ? Object.freeze({ ...this.state }) : this.state;
  }

  getConfig(): Readonly<GameConfig> {
    return DEV_MODE ? Object.freeze({ ...this.config }) : this.config;
  }

  async setConfig(partialConfig: Partial<GameConfig>) {
    this.config = { ...this.config, ...partialConfig };
    this.events.emit('CONFIG_UPDATED', { config: this.config });
  }

  getPlayer(): Player | null {
    return this.state.playerMap.get(this.playerId) ?? null;
  }

  getContext(): GameContext {
    return {
      tick: this.tick,
      status: this.status,
      playerId: this.playerId,
      config: this.getConfig() // remove this?
    };
  }

  getFnContext(): FnContext {
    return {
      S: this.state, // TODO: make readonly
      E: this.events,
      P: this.state.playerMap.get(this.playerId)!,
      C: this.getContext()
    };
  }

  protected addPlayer(player: Partial<Player> & { id: string }): Player {
    if (this.state.playerMap.has(player.id)) {
      return this.state.playerMap.get(player.id)!;
    }

    const score = player.score ?? {
      userId: player.id,
      playerName: player.name ?? `Player ${this.state.playerMap.size + 1}`,
      score: 0,
      tick: 0,
      timestamp: Date.now()
    };

    const _player = {
      name: player.name ?? `Player ${this.state.playerMap.size + 1}`,
      score,
      color: '#000000',
      ...player,
      stats: { playerId: player.id, systems: 0, ships: 0, homeworld: 0 },
      isAlive: true,
      visitedSystems: new Set<string>(),
      revealedSystems: new Set<string>()
    } satisfies Player;
    game.addPlayer(this.state, _player);

    return _player;
  }

  protected gameStart() {
    this.status = 'PLAYING';
    this.tick = 0;

    this.events.emit('GAME_START', undefined);

    this.#runGameLoop();
  }

  protected gameStop() {
    this.status = 'FINISHED';
    this.stopGameLoop();
  }

  public gameTick() {
    this.tick++;

    this.game.gameTick(this.getFnContext());
    this.game.checkVictory(this.getFnContext());
    this.events.emit('STATE_UPDATED', {
      state: this.state,
      status: this.status
    });
  }

  #runGameLoop() {
    if (this.status !== 'PLAYING') {
      this.gameStop();
      return;
    }

    this.stopGameLoop();
    this.gameTick();

    this.events.emit('GAME_TICK', { tick: this.tick });

    this.runningInterval = setTimeout(
      () => this.#runGameLoop(),
      TICK_DURATION_MS / this.config.timeScale
    ) as unknown as number;
  }

  protected startGameLoop() {
    this.#runGameLoop();
  }

  protected stopGameLoop() {
    if (this.runningInterval) {
      clearTimeout(this.runningInterval);
      this.runningInterval = null;
    }
  }

  #registerEventListeners() {
    this.events.on('GAME_STOP', () => {
      this.gameStop();
    });

    this.events.on('TAKE_ORDER', (order: Order) => {
      this.game.takeOrder(this.getFnContext(), order);

      this.events.emit('STATE_UPDATED', {
        state: this.state,
        status: this.status
      });
    });
  }
}
