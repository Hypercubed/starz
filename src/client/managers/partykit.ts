import { MiniSignal } from 'mini-signals';

import { LocalGameManager, type LocalGameManagerEvents } from './local.ts';

import { PartyServerMessageTypes } from '../../server/shared.ts';
import { PartykitGameLobby } from './services/partykit-lobby.ts';
import type { LeaderboardEntry } from '../../server/types';
import { type EventBusEmit, type EventBusOn } from './classes/event-bus.ts';
import type { ManagerFeatures } from './types';

type PartykitGameManagerEvents = LocalGameManagerEvents & {
  readonly LEADERBOARD_UPDATED: MiniSignal<
    [{ leaderboard: LeaderboardEntry[] }]
  >;
  readonly PLAYER_AUTH_UPDATED: MiniSignal<
    [
      {
        playerId: string;
        playerToken: string;
      }
    ]
  >;
};

export class PartykitGameManager extends LocalGameManager {
  readonly name: string = 'PartykitGameManager';

  declare protected events: PartykitGameManagerEvents;
  declare on: EventBusOn<PartykitGameManagerEvents>;
  declare emit: EventBusEmit<PartykitGameManagerEvents>;

  private partykitLobby = new PartykitGameLobby();

  readonly features: ManagerFeatures = {
    multiplayer: false,
    leaderboard: true
  };

  constructor() {
    super();
    this.addEvents({
      LEADERBOARD_UPDATED: new MiniSignal<
        [{ leaderboard: LeaderboardEntry[] }]
      >(),
      PLAYER_AUTH_UPDATED: new MiniSignal<
        [
          {
            playerId: string;
            playerToken: string;
          }
        ]
      >()
    });
  }

  get playerToken() {
    return this.partykitLobby.playerToken;
  }

  async connect() {
    this.partykitLobby.connect();
    this.#registerEvents();
    super.connect();
  }

  protected async initializePlayer() {
    console.log('Initializing player...');

    const player = await super.initializePlayer();
    this.playerId = player.id;

    if (this.partykitLobby.playerToken && player.id) {
      const playerData = await this.partykitLobby.getScore(player.id);
      if (playerData) {
        this.playerId = player.id = playerData.uid ?? player.id;
        player.name = playerData?.name ?? player.name;
        player.score = playerData?.score
          ? {
              score: playerData.score,
              rank: playerData.rank
            }
          : player.score;

        this.updatePlayerName(player.name);
      }
    }

    return player;
  }

  protected async submitWinLoss(deltaScore: number) {
    super.submitWinLoss(deltaScore);
    const updatedEntry = await this.partykitLobby.submitDeltaScore(
      this.playerId,
      this.thisPlayer.name,
      deltaScore
    );
    if (updatedEntry) {
      this.thisPlayer.score = {
        score: updatedEntry.score,
        rank: updatedEntry.rank
      };
    }
    this.events.PLAYER_UPDATED.dispatch({ playerId: this.thisPlayer.id });
  }

  async setPlayerAuth(playerId: string, playerToken: string) {
    if (playerToken && playerId) {
      this.playerId = playerId;
      this.partykitLobby.setPlayerToken(playerToken);

      const playerData = await this.partykitLobby.getScore(playerId);
      if (playerData) {
        const player = this.thisPlayer;
        this.playerId = player.id = playerData?.uid ?? this.playerId;
        player.name = playerData?.name ?? player.name;
        player.score = playerData?.score
          ? {
              score: playerData.score,
              rank: playerData.rank
            }
          : player.score;
      }

      this.updatePlayerName(this.thisPlayer.name);
    }

    localStorage.setItem('starz_playerId', this.playerId);
    localStorage.setItem('starz_playerName', this.thisPlayer.name);
  }

  async loadLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.partykitLobby.loadLeaderboard();
  }

  #registerEvents() {
    this.partykitLobby.on(
      PartyServerMessageTypes.LEADERBOARD_UPDATED,
      (data) => {
        this.events.LEADERBOARD_UPDATED.dispatch(data);
      }
    );
  }
}
