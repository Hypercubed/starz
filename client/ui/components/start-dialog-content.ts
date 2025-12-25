import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { version } from '../../../package.json';

import { gameManager } from './app-context.ts';
import lore from './lore.html?raw';

import type { GameManager } from '../../managers/manager.ts';
import type { Player } from '../../types';

const shortIdCache = new Map<string, string>();

function shortId(uid: string): string {
  if (shortIdCache.has(uid)) {
    return shortIdCache.get(uid)!;
  }
  const id = get(uid);
  shortIdCache.set(uid, id);
  return id;

  function get(uid: string): string {
    const hash = Array.from(uid).reduce((hashAcc, char) => {
      return (hashAcc << 5) - hashAcc + char.charCodeAt(0);
    }, 0);
    return Math.abs(hash).toString(36).substring(0, 4);
  }
}

@customElement('start-dialog-content')
export class StartDialogContentElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: GameManager;

  @state()
  private player!: Player | null;

  createRenderRoot() {
    return this;
  }

  @state()
  protected version = version;

  @query('#playerNameInput')
  private playerNameInput!: HTMLInputElement;

  private keyText =
    'Use this key to restore your player data later.  Click to copy.';

  connectedCallback() {
    super.connectedCallback();
    this.#setupListeners();
  }

  render() {
    const sId = shortId(this.player?.id ?? '');
    const token = this.generateToken((this.gameManager as any).playerToken);

    return html`
      <article>
        <h1>STARZ!</h1>
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
                @keydown="${this.onKeydown}"
                placeholder="Name or Save Key"
                minlength="1"
                maxlength="3000"
                required
              />
              <small>(Name will be used in leaderboard)</small>
            </div>
            <div>
              ${this.player?.name ?? ''} [${sId}]
              ${this.player?.score
                ? html`<span>✶ ${this.player.score!.score}</span>`
                : ''}
              <br /><small
                >${this.player?.score?.rank
                  ? `Rank: ${this.player.score.rank}`
                  : ''}</small
              >
              <small
                data-tooltip="${this.keyText}"
                @click="${() => this.copyText(token)}"
                style="cursor: copy;"
              >
                ${token ? `Token` : ''}</small
              >
            </div>
          </div>

          <br /><button type="button" @click="${this.onPlay}">
            Start Game
          </button>
          <br /><button type="button" @click="${this.onOptions}">
            Options
          </button>
        </form>
      </article>
    `;
  }

  private async onPlay() {
    let playerName = this.playerNameInput.value.trim() || 'Anonymous';

    playerName = playerName.substring(0, 30);

    await this.gameManager.setConfig({ playerName });
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

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();

      const input = this.querySelector('#playerNameInput') as HTMLInputElement;
      const inputText = input.value.trim();
      this.setName(inputText);
    }
  }

  private async setName(playerName: string) {
    await this.gameManager.setConfig({
      playerName
    });
    this.requestUpdate();
  }

  private generateToken(playerToken: string) {
    if (!playerToken) return '';
    return `${this.player?.id}::${playerToken}`;
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

    this.gameManager.events.on('CONFIG_UPDATED', () => {
      this.player = this.gameManager.getPlayer();
    });

    this.gameManager.events.on('GAME_INIT', () => {
      this.player = this.gameManager.getPlayer();
    });
  }
}
