import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { version } from '../../../../package.json';

import { gameManager } from './app-context.ts';
import lore from './lore.html?raw';

import type { GameManager } from '../../managers/manager.ts';
import type { Player } from '../../types';
import type { PartykitGameManager } from '../../managers/partykit.ts';

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
    const sId = generateShortId(this.player?.id);
    const token = generateToken(this.player?.id, (this.gameManager as PartykitGameManager).playerToken);
``
    return html`
      <lobby-leaderboard-element></lobby-leaderboard-element>
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
                @input="${this.onChange}"
                placeholder="Name or Save Key"
                minlength="1"
                maxlength="3000"
                required
              />
              <small>(Name will be used in leaderboard)</small>
            </div>
            <div>
              <span>${this.player?.name ?? ''}</span><span class="short-id">#${sId}</span>
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

    this.gameManager.events.on('CONFIG_UPDATED', () => {
      this.player = this.gameManager.getPlayer();
    });

    this.gameManager.events.on('GAME_INIT', () => {
      this.player = this.gameManager.getPlayer();
    });
  }
}

function generateShortId(playerId: string | undefined): string {
  return playerId?.slice(0, 4) ?? '';
}

function generateToken(playerId: string | undefined, playerToken: string): string {
  if (!playerId || !playerToken) return '';
  return `${playerId}::${playerToken}`;
}