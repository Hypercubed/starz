import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { version } from '../../../../package.json';

import { gameManager } from './app-context.ts';
import lore from './lore.html?raw';

import type { GameManager } from '../../managers/manager.ts';
import type { Player } from '../../types';
import { PartykitGameManager } from '../../managers/partykit.ts';
import { botIcon, cogIcon, playIcon, plusIcon } from './icons.ts';
import { GameEvents } from '../../game/shared.ts';
import { LocalGameManager } from '../../managers/local.ts';

@customElement('start-dialog-content')
export class StartDialogContentElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: GameManager;

  @state()
  private player!: Player | null;

  @state()
  private players: Player[] = [];

  createRenderRoot() {
    return this;
  }

  @state()
  protected version = version;

  @state()
  private playerToken: string = '';

  @state()
  page: 'start' | 'room' = 'start';

  @query('#playerNameInput')
  private playerNameInput!: HTMLInputElement;

  private keyText =
    'Click to copy your save key. Use this key to restore your player data later.';

  connectedCallback() {
    super.connectedCallback();
    this.#setupListeners();
  }
  startPage() {
    const sId = generateShortId(this.player, this.playerToken);
    const token = generateToken(this.player?.id, this.playerToken);
    console.log('Generated token:', { sId, token });

    return html` <h1>STARZ!</h1>
      <small class="version">v${this.version}</small>

      ${unsafeHTML(lore)}

      <form method="dialog">
        <div class="grid">
          <div>
            <input
              name="playerName"
              id="playerNameInput"
              type="text"
              .value=${this.player?.name ?? ''}
              @input="${this.onChange}"
              @keydown="${this.onKeydown}"
              placeholder="Name or Save Key"
              minlength="1"
              maxlength="32"
              required
            />
            <small>(Name will be used in leaderboard)</small>
          </div>
          <div>
            <span>${this.player?.name ?? ''}</span
            ><span
              class="short-id"
              data-tooltip="${this.keyText}"
              @click="${() => this.copyText(token)}"
              >${sId}</span
            >
            ${this.player?.score
              ? html`<span>✶ ${this.player.score!.score}</span>`
              : ''}
            <br /><small
              >${this.player?.score?.rank
                ? `Rank: ${this.player.score.rank}`
                : ''}</small
            >
          </div>
        </div>

        <button type="button" @click="${this.onTest}">Name Game</button>
      </form>`;
  }

  roomPage() {
    return html` <h4>Welcome, ${this.player?.name ?? ''}</h4>
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
                >${generateShortId(player, this.playerToken)}</span
              >
            </li>`
        )}
      </ul>
      <button type="button" @click="${this.onAddBot}">
        ${unsafeHTML(plusIcon)} Add Bot
      </button>
      <button type="button" @click="${this.onPlay}">
        ${unsafeHTML(playIcon)}
      </button>
      <button type="button" @click="${this.onOptions}">
        ${unsafeHTML(cogIcon)}
      </button>`;
  }

  renderInner() {
    switch (this.page) {
      case 'start':
        return this.startPage();
      case 'room':
        return this.roomPage();
    }
  }

  render() {
    return html`
      <lobby-leaderboard-element></lobby-leaderboard-element>
      <article>${this.renderInner()}</article>
    `;
  }

  onTest() {
    this.page = 'room';
  }

  private removeBot(id: string) {
    console.log('Removing bot', id);
    if (
      this.gameManager instanceof LocalGameManager ||
      this.gameManager instanceof PartykitGameManager
    ) {
      this.gameManager.removeBot(id);
    }
  }

  private async onAddBot() {
    if (
      this.gameManager instanceof LocalGameManager ||
      this.gameManager instanceof PartykitGameManager
    ) {
      this.gameManager.addBot();
    }
  }

  private async onPlay() {
    await this.gameManager.setConfig({ playerName: this.player?.name ?? '' });
    this.dispatchEvent(new Event('startClicked'));
    this.page = 'start';
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

  showOptions() {
    const optionsDialog = document.getElementById(
      'optionsDialog'
    ) as HTMLDialogElement;
    optionsDialog.showModal();

    return new Promise<boolean>((resolve) => {
      optionsDialog.addEventListener('close', () => resolve(true));
      optionsDialog.addEventListener('cancel', () => resolve(false));
    });
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.setName((e.target as HTMLInputElement).value);
    }
  }

  private onChange(e: Event) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.setName((e.target as HTMLInputElement).value);
  }

  private async setName(playerName: string) {
    playerName = playerName.trim();

    if (
      this.gameManager instanceof PartykitGameManager &&
      playerName.includes('::')
    ) {
      const [playerId, playerToken] = playerName.split('::');
      await this.gameManager.setPlayerAuth(playerId, playerToken);
      this.playerToken = playerToken;
      this.playerNameInput.value = this.gameManager.getPlayer()?.name ?? '';
    } else if (this.gameManager instanceof LocalGameManager) {
      this.gameManager.updatePlayerName(playerName);
      this.playerNameInput.value = this.gameManager.getPlayer()?.name ?? '';
    }
  }

  async copyText(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      this.keyText = 'Copied to clipboard!';
      this.requestUpdate();
      setTimeout(() => {
        this.keyText =
          'Use this key to restore your player data later.  Click to copy.';
        this.requestUpdate();
      }, 2000);
    } catch {
      // Ignore
    }
  }

  #setupListeners() {
    const update = () => {
      this.players = Array.from(this.gameManager.getState().playerMap.values());
      this.player = this.gameManager.getPlayer();
      this.playerToken =
        (this.gameManager as PartykitGameManager).playerToken ?? '';
      console.log('StartDialogContent updated player:', this.playerToken);
    };

    update();

    this.gameManager.events.on(GameEvents.PLAYER_AUTH_UPDATED, update);
    this.gameManager.events.on(GameEvents.PLAYER_JOINED, update);
    this.gameManager.events.on(GameEvents.PLAYER_REMOVED, update);
    this.gameManager.events.on(GameEvents.PLAYER_UPDATED, update);
    this.gameManager.events.on(GameEvents.CONFIG_UPDATED, update);
    this.gameManager.events.on(GameEvents.GAME_INIT, update);
  }
}

function generateShortId(player: Player | null, playerToken: string): string {
  if (!player) return '';
  if (player.bot) return '';
  if (!playerToken) return ''; // no token for local players
  return player.id ? '#' + player.id.slice(0, 4) : '';
}

function generateToken(
  playerId: string | undefined,
  playerToken: string
): string {
  if (!playerId || !playerToken) return '';
  return `${playerId}::${playerToken}`;
}
