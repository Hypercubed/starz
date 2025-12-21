import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { version } from '../../package.json';
import * as ui from '../ui';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../managers/manager';

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
  protected playerName: string = 'Player';

  @property()
  protected playerScore: number = 0;

  @property()
  protected playerRank: number | null = null;

  @property()
  protected shortId: string = '';

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
                value="${this.playerName}"
                placeholder="Player Name"
                minlength="1"
                maxlength="30"
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
    this.playerName = P?.name ?? C.config?.playerName ?? 'Player';
    this.playerScore = P?.score.score ?? 0;
    this.playerRank = (P?.score as any)?.rank ?? null;
    this.shortId = generateShortId(C.playerId);
  }

  private onPlay() {
    const input = this.querySelector('#playerNameInput') as HTMLInputElement;
    const playerName = input.value.trim() || 'Player';

    this.gameManager.setConfig({ playerName });
    (this.closest('dialog') as HTMLDialogElement).close();
  }

  private onOptions() {
    ui.openOptions();
  }
}

function generateShortId(uid: string): string {
  const combined = uid + name;
  const hash = Array.from(combined).reduce((hashAcc, char) => {
    return (hashAcc << 5) - hashAcc + char.charCodeAt(0);
  }, 0);
  return Math.abs(hash).toString(36).substring(0, 4);
}
