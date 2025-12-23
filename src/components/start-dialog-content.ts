import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { version } from '../../package.json';
import * as ui from '../ui';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../managers/manager';
import { pack, unpack } from 'msgpackr';

@customElement('start-dialog-content')
export class StartDialogContentElement extends LitElement {
  @consume({ context: gameManager, subscribe: true })
  @property({ attribute: false })
  gameManager!: GameManager;

  createRenderRoot() {
    return this;
  }

  @property()
  protected version = version;

  @property()
  protected playerName: string = '';

  @property()
  protected playerScore: number = 0;

  @property()
  protected playerRank: number | null = null;

  @property()
  protected playerToken: string = '';

  @property()
  protected shortId: string = '';

  private playerId: string = '';
  private keyText = 'Use this key to restore your player data later.  Click to copy.';

  connectedCallback() {
    super.connectedCallback();

    this.updatePlayerInfo();

    this.gameManager.events.on('GAME_INIT', () => {
      this.updatePlayerInfo();
    });
  }

  render() {
    return html`
      <article>
        <h1>STARZ!</h1>
        <small class="version">v${this.version}</small>

        <div class="lore">
          <p>
            Nobody knows why <i>The Bubble</i> exists, or who built the lattice
            of hyperspace lanes threading its hundreds of star systems together
            like a cosmic web. Its discovery was accidental - a distortion
            ripple detected on the edge of settled space, leading explorers to
            the shimmering boundary of a region where physics seemed... wrong.
          </p>
          <p>
            What <i>is</i> known is this: control of <i>The Bubble</i> means
            control of immense resources and power. Rival factions flood its
            systems, each desperate to carve out their claim before somebody
            else does.
          </p>
          <p>
            As a commander, you are the spearhead of your faction's ambitions:
            tasked with expanding your influence, capturing systems, and
            ultimately dominating <i>The Bubble</i>.
          </p>
        </div>

        <h3>Protect our homeworld. Capture the enemy systems.</h3>
        <form method="dialog">
          <div class="grid">
            <div>
              <input
                name="playerName"
                id="playerNameInput"
                type="text"
                .value=${this.playerName}
                @keydown="${this.onKeydown}"
                placeholder="Name or Save Key"
                minlength="1"
                maxlength="3000"
                required
              />
              <small>(Name will be used in leaderboard)</small>
            </div>
            <div>
              ${this.playerName} [${this.shortId}]
              <span>✶ ${this.playerScore}</span>
              <br /><small
                >${this.playerRank ? `Rank: ${this.playerRank}` : ''}</small
              >
              <small data-tooltip="${this.keyText}" @click="${this.copyText}" style="cursor: copy;">
                ${this.playerToken ? `Token` : ''}</small
              >
            </div>
          </div>

          <br /><button type="button" @click="${this.onPlay}">Play</button>
          <br /><button type="button" @click="${this.onOptions}">
            Options
          </button>
        </form>
      </article>
    `;
  }

  private updatePlayerInfo() {
    const { P, C } = this.gameManager.getContext();
    this.playerName = P?.name ?? C.config?.playerName ?? '';
    this.playerScore = P?.score.score ?? 0;
    this.playerRank = (P?.score as any)?.rank ?? null;
    this.playerId = C.playerId;
    this.shortId =
      C.playerId.length === 4 ? C.playerId : generateShortId(C.playerId);

    this.playerToken= this.genertateToken();
  }

  private onPlay() {
    const input = this.querySelector('#playerNameInput') as HTMLInputElement;
    let playerName = input.value.trim() || 'Anonymous';

    playerName = playerName.substring(0, 30);

    this.gameManager.setConfig({ playerName });
    (this.closest('dialog') as HTMLDialogElement).close();
  }

  private onOptions() {
    ui.openOptions();
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();

      const input = this.querySelector('#playerNameInput') as HTMLInputElement;
      const inputText = input.value.trim();
      this.readToken(inputText);

      input.value = this.playerName;
    }
  }

  private readToken(token: string) {
    // Attempt to decode player save key
    try {
      const decoded = (Uint8Array as any).fromBase64(token);
      const parsed = unpack(decoded);

      this.playerName = parsed.starz_playerName ?? this.playerName;
      this.playerScore = parsed.starz_score ?? this.playerScore;
      this.shortId = parsed.starz_playerId.length === 4 ? parsed.starz_playerId : generateShortId(parsed.starz_playerId);
      this.requestUpdate();

      Object.entries(parsed).forEach(([key, value]) => {
        if (key.startsWith('starz_')) {
          localStorage.setItem(key, value as string);
        }
      });

      setTimeout(() => {
        this.requestUpdate();
      }, 100);

      // window.location.reload();
    } catch {
      this.playerName = token ?? this.playerName;
    }
  }

  private genertateToken() {
    const t = {
      starz_playerId: this.playerId,
      starz_playerName: this.playerName,
      starz_version: this.version,
      starz_score: this.playerScore
    };
    return pack(t).toBase64();
  }

  async copyText() {
    try {
      await navigator.clipboard.writeText(this.playerToken);
      this.keyText = 'Copied to clipboard!';
      this.requestUpdate();
      setTimeout(() => {
        this.keyText = 'Use this key to restore your player data later.  Click to copy.';
        this.requestUpdate();
      }, 2000);
    } catch {
      // Ignore
    }
  }
}

function generateShortId(uid: string): string {
  const combined = uid + name;
  const hash = Array.from(combined).reduce((hashAcc, char) => {
    return (hashAcc << 5) - hashAcc + char.charCodeAt(0);
  }, 0);
  return Math.abs(hash).toString(36).substring(0, 4);
}
