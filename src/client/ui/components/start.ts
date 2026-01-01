import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { gameManager } from './app-context.ts';
import lore from './lore.html?raw';

import type { Player } from '../../types';
import type { PartykitGameManager } from '../../managers/partykit.ts';
import type { LocalGameManager } from '../../managers/local.ts';
import { isPartykitGameManager } from '../../managers/shared.ts';
import { discordIcon, githubIcon } from './icons.ts';

@customElement('start-screen')
export class StartScreenElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: LocalGameManager;

  @state()
  private player!: Player | null;

  @state()
  private playerToken: string = '';

  @state()
  private roomCode: string = '';

  @query('#playerNameInput')
  private playerNameInput!: HTMLInputElement;

  private keyText =
    'Click to copy your save key. Use this key to restore your player data later.';

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.classList.add('start-screen');

    const roomCode = this.getRoomCodeFromURL();
    if (roomCode) {
      console.log('Found room code in URL:', roomCode);
      this.roomCode = roomCode;
    }

    this.#setupListeners();
  }

  private getRoomCodeFromURL(): string | null {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.substring(1));
    const roomCode = urlParams.get('r');
    return roomCode ?? null;
  }

  render() {
    const sId = generateShortId(this.player, this.playerToken);
    const token = generateToken(this.player?.id, this.playerToken);
    const features = this.gameManager.features ?? {
      multiplayer: false,
      leaderboard: false
    };

    return html` <lobby-leaderboard-element></lobby-leaderboard-element>
      <article>
        <h1>STARZ!</h1>
        ${this.renderLinks()}
        <small class="version">${__APP_VERSION__}</small>

        ${unsafeHTML(lore)}

        <form method="dialog">
          <div class="start-screen__grid">
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
          ${features.leaderboard
            ? html`<p>
                <small
                  ><abbr
                    data-tooltip="Username is public — don't use real names."
                    >(Name will be used in leaderboard)</abbr
                  ></small
                >
              </p>`
            : ''}

          <button type="button" @click="${this.onNewGame}">
            Create Name Game
          </button>

          ${features.multiplayer ? html`${this.renderJoinRoom()}` : ''}
        </form>
      </article>`;
  }

  renderJoinRoom() {
    return html`<hr />
      <input
        type="text"
        id="roomCodeInput"
        placeholder="Enter a Room Code"
        .value=${this.roomCode}
        @input=${(e: any) =>
          (this.roomCode = (e.target as HTMLInputElement).value)}
      />
      <button type="button" @click="${this.onJoinRoom}">Join Room</button>`;
  }

  renderLinks() {
    return html`<p>
      <a href="https://github.com/Hypercubed/starz">
        ${unsafeHTML(githubIcon)}
      </a>
      <a href="https://discord.gg/vnJxSCwfYY"> ${unsafeHTML(discordIcon)} </a>
    </p>`;
  }

  async onNewGame() {
    await this.gameManager.setConfig({ playerName: this.player?.name ?? '' });
    this.removeRoomCodeFromURL();
    this.dispatchEvent(new Event('newGameClicked'));
  }

  private removeRoomCodeFromURL() {
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
  }

  private setRoomCodeInURL(roomCode: string) {
    const url = new URL(window.location.href);
    url.hash = `r=${roomCode}`;
    window.history.replaceState({}, document.title, url.toString());
  }

  onJoinRoom() {
    console.log('Joining room', this.roomCode);
    const roomCode = this.roomCode.trim();
    this.setRoomCodeInURL(roomCode);
    this.dispatchEvent(
      new CustomEvent('joinRoomClicked', { detail: { roomCode } })
    );
  }

  private async onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      await this.setName((e.target as HTMLInputElement).value);
    }
  }

  private async onChange(e: Event) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    await this.setName((e.target as HTMLInputElement).value);
  }

  private async setName(playerName: string) {
    playerName = playerName.trim();

    if (isPartykitGameManager(this.gameManager) && playerName.includes('::')) {
      const [playerId, playerToken] = playerName.split('::');
      await this.gameManager.setPlayerAuth(playerId, playerToken);
      this.playerToken = playerToken;
      this.playerNameInput.value = this.gameManager.getPlayer()?.name ?? '';
    } else {
      this.gameManager.updatePlayerName(playerName);
      this.playerNameInput.value = this.gameManager.getPlayer()?.name ?? '';
    }
  }

  private async copyText(token: string) {
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
      this.player = this.gameManager.getPlayer();
      this.playerToken =
        (this.gameManager as PartykitGameManager).playerToken ?? '';
    };

    update();

    this.gameManager.on('PLAYER_JOINED', update);
    this.gameManager.on('PLAYER_REMOVED', update);
    this.gameManager.on('PLAYER_UPDATED', update);
    this.gameManager.on('CONFIG_UPDATED', update);
    this.gameManager.on('GAME_INIT', update);

    if (isPartykitGameManager(this.gameManager)) {
      this.gameManager.on('PLAYER_AUTH_UPDATED', update);
    }
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
