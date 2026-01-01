import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { gameManager } from './app-context.ts';

import type { Player } from '../../types';
import { botIcon, cogIcon, playIcon, plusIcon } from './icons.ts';
import type { LocalGameManager } from '../../managers/local.ts';
import { isPlayroomGameManager } from '../../managers/shared.ts';
import { classMap } from 'lit/directives/class-map.js';
import { when } from 'lit/directives/when.js';

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

  private intervalId: number | undefined;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#setupListeners();

    if (isPlayroomGameManager(this.gameManager)) {
      const manager = this.gameManager;
      this.intervalId = setInterval(() => {
        this.isHost = manager.isHost();
      }, 500); // Update every 500ms
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  renderRoomCode() {
    return html` <p>
      Room Code:
      <span @click="${this.onCopy}" data-tooltip="Click to copy"
        >${this.roomCode}</span
      >
      <br /><small @click="${this.onShare}"
        ><a href="#r=${this.roomCode}">(click to share)</a></small
      >
    </p>`;
  }

  render() {
    return html`<article>
      <h4>Welcome, ${this.player?.name ?? ''}</h4>
      ${when(this.roomCode, () => this.renderRoomCode())}
      <fieldset>
        <legend>Players ${this.players.length}</legend>

        <ul class="player-list">
          ${this.players.map(
            (player) =>
              html`<li
                style="--owner-color: ${player.color || null}"
                class="${classMap({
                  bot: !!player.bot,
                  human: !player.bot,
                  clearable: this.isHost && !!player.bot
                })}"
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
      </fieldset>

      ${this.gameManager.isMultiplayer()
        ? this.isHost
          ? html`<p>You are the host.</p>`
          : html`<p>Waiting for host to start the game...</p>`
        : ''}
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
      }
    };

    update();

    this.gameManager.on('PLAYER_REMOVED', () => update);
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

  // TODO: Make this a reusable directive?
  private async onCopy(event: PointerEvent) {
    event.preventDefault();

    if (navigator.clipboard) {
      const el = event.target as HTMLElement;
      const tooltip = el.getAttribute('data-tooltip') || '';

      await navigator.clipboard.writeText(this.roomCode);
      el.setAttribute('data-tooltip', 'Copied to clipboard!');
      setTimeout(() => {
        el.setAttribute('data-tooltip', tooltip);
      }, 2000);
    }
  }

  private async onShare(event: PointerEvent) {
    event.preventDefault(); // Prevent navigation

    if (navigator.share) {
      navigator.share({
        title: 'Starz.io Game Lobby',
        url: window.location.href
      });
    }
  }
}

function generateShortId(player: Player | null): string {
  if (!player) return '';
  if (player.bot) return '';
  return player.id ? '#' + player.id.slice(0, 4) : '';
}
