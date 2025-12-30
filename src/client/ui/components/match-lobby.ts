import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { gameManager } from './app-context.ts';

import type { Player } from '../../types';
import { botIcon, cogIcon, playIcon, plusIcon } from './icons.ts';
import type { LocalGameManager } from '../../managers/local.ts';
import { isPlayroomGameManager } from '../../managers/shared.ts';

@customElement('match-lobby')
export class MatchLobbyElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: LocalGameManager;

  @state()
  private player!: Player | null;

  @state()
  private players: Player[] = [];

  @state()
  private roomCode: string = '';

  @state()
  private isHost: boolean = true;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#setupListeners();
  }

  render() {
    return html`<article>
      <h4>Welcome, ${this.player?.name ?? ''}</h4>
      ${this.roomCode ? html`<p>Room Code: ${this.roomCode}</p>` : ''}
      <p>Players ${this.players.length}</p>
      <ul class="player-list">
        ${this.players.map(
          (player) =>
            html`<li
              style="--owner-color: ${player.color || null}"
              class="${player.bot ? 'bot' : 'human'}"
              @click="${() => {
                this.removeBot(player.id);
              }}"
            >
              ${player.bot ? unsafeHTML(botIcon) : ''} ${player.name}<span
                class="short-id"
                >${generateShortId(player)}</span
              >
            </li>`
        )}
      </ul>
      ${this.isHost
        ? html`<p>You are the host.</p>`
        : html`<p>Waiting for host to start the game...</p>`}
      ${this.isHost ? this.renderActions() : ''}
    </article>`;
  }

  private renderActions() {
    return html`
    <button type="button" @click="${this.onAddBot}">
        ${unsafeHTML(plusIcon)} Add Bot
      </button>
      <button type="button" @click="${this.onPlay}">
        ${unsafeHTML(playIcon)}
      </button>
      <button type="button" @click="${this.onOptions}">
        ${unsafeHTML(cogIcon)}
      </button></article>`;
  }

  private removeBot(id: string) {
    if (!this.isHost) return;
    this.gameManager.removeBot(id);
  }

  private async onAddBot() {
    this.gameManager.addBot();
  }

  private async onPlay() {
    this.dispatchEvent(new Event('startClicked'));
  }

  private async onOptions() {
    const ret = await this.showOptions();
    if (ret) {
      const form = document.getElementById('optionsForm') as HTMLFormElement;
      const formData = new FormData(form);

      const gameManager = globalThis.gameManager;

      const numBots = +formData.get('numBots')!;
      const playerName = formData.get('playerName') as string;
      const fow = formData.get('fow') === 'on';
      const numSystems = +formData.get('numSystems')!;

      gameManager.setConfig({
        numBots,
        playerName,
        fow,
        numSystems: 48 * 2 ** numSystems
      });
    }
  }

  private showOptions() {
    const optionsDialog = document.getElementById(
      'optionsDialog'
    ) as HTMLDialogElement;
    optionsDialog.showModal();

    return new Promise<boolean>((resolve) => {
      optionsDialog.addEventListener('close', () => resolve(true));
      optionsDialog.addEventListener('cancel', () => resolve(false));
    });
  }

  #setupListeners() {
    const update = () => {
      this.players = Array.from(this.gameManager.getState().playerMap.values());
      this.player = this.gameManager.getPlayer();

      if (isPlayroomGameManager(this.gameManager)) {
        this.isHost = this.gameManager.isHost();
        console.log('Lobby isHost:', this.isHost);
      }
    };

    update();

    this.gameManager.on('PLAYER_REMOVED', () => {
      console.log('PLAYER_REMOVED event in lobby');
      update();
    });

    this.gameManager.on('PLAYER_JOINED', update);
    this.gameManager.on('PLAYER_REMOVED', update);
    this.gameManager.on('PLAYER_UPDATED', update);
    this.gameManager.on('CONFIG_UPDATED', update);
    this.gameManager.on('GAME_INIT', update);

    if (isPlayroomGameManager(this.gameManager)) {
      this.gameManager.on(
        'ROOM_CREATED',
        ({ roomId, isHost }: { roomId: string; isHost: boolean }) => {
          this.roomCode = roomId;
          this.isHost = isHost;
        }
      );
    }
  }
}

function generateShortId(player: Player | null): string {
  if (!player) return '';
  if (player.bot) return '';
  return player.id ? '#' + player.id.slice(0, 4) : '';
}
