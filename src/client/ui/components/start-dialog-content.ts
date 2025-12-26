import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { version } from '../../../../package.json';

import { gameManager } from './app-context.ts';
import lore from './lore.html?raw';

import playIcon from 'lucide-static/icons/play.svg?raw';
import cogIcon from 'lucide-static/icons/cog.svg?raw';
import plusIcon from 'lucide-static/icons/plus.svg?raw';

import type { GameManager } from '../../managers/manager.ts';
import type { Player } from '../../types';
import { PartykitGameManager } from '../../managers/partykit.ts';

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
  page: 'start' | 'room' = 'start';

  private keyText =
    'Click to copy your save key. Use this key to restore your player data later.';

  connectedCallback() {
    super.connectedCallback();
    this.#setupListeners();
  }

  startPage() {
    const sId = generateShortId(this.player);
    const token = generateToken(
      this.player?.id,
      (this.gameManager as PartykitGameManager).playerToken
    );

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
            html`<li>
              ${player.name}<span class="short-id"
                >${generateShortId(player)}</span
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

  private async onAddBot() {
    if (this.gameManager instanceof PartykitGameManager) {
      this.gameManager.addBot();
    }
  }

  private async onPlay() {
    await this.gameManager.setConfig({ playerName: this.player?.name ?? '' });
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

  private onChange(e: Event) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.setName((e.target as HTMLInputElement).value);
  }

  private async setName(playerName: string) {
    playerName = playerName.trim();
    await this.gameManager.setConfig({
      playerName
    });
    this.requestUpdate();
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
    this.player = this.gameManager.getPlayer();
    this.players = Array.from(this.gameManager.getState().playerMap.values());

    this.gameManager.events.on('PLAYER_ADDED', () => {
      this.players = Array.from(this.gameManager.getState().playerMap.values());
    });

    this.gameManager.events.on('CONFIG_UPDATED', () => {
      this.player = this.gameManager.getPlayer();
    });

    this.gameManager.events.on('GAME_INIT', () => {
      this.player = this.gameManager.getPlayer();
    });
  }
}

function generateShortId(player: Player | null): string {
  if (!player) return '';
  if (player.bot) return '';
  return player.id ? '#' + player.id.slice(0, 4) : '';
}

function generateToken(
  playerId: string | undefined,
  playerToken: string
): string {
  if (!playerId || !playerToken) return '';
  return `${playerId}::${playerToken}`;
}
