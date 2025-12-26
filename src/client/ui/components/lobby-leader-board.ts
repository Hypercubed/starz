import { consume } from '@lit/context';
import * as d3 from 'd3';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../../managers/manager.ts';
import { PartykitGameManager } from '../../managers/partykit.ts';
import type { LeaderboardEntry } from '../../../server/types';
import { GameEvents } from '../../game/shared.ts';

const formatSIInteger = d3.format('.3~s');

const SP = ' '; // non-breaking space

@customElement('lobby-leaderboard-element')
export class LobbyLeaderboardElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: GameManager;

  @state()
  private leaderboard: LeaderboardEntry[] = [];

  createRenderRoot() {
    return this;
  }

  @state()
  showMore = false;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    if (this.gameManager instanceof PartykitGameManager) {
      this.leaderboard = await this.gameManager.loadLeaderboard();

      this.gameManager.events.on(
        GameEvents.LEADERBOARD_UPDATED,
        async ({ leaderboard }) => {
          this.leaderboard = leaderboard;
        }
      );
    }
  }

  render() {
    if (!this.leaderboard || this.leaderboard.length === 0) {
      return html``;
    }

    return html`
      <table id="leaderbox">
        ${this.renderHeader()} ${this.renderBody()}
      </table>
      <details @toggle="${this.onOpenMore}">
        <summary>Show More</summary>
      </details>
    `;
  }

  private renderBody() {
    return html`<tbody>
      ${this.leaderboard.slice(0, 5).map(playerHtml)}
      ${this.showMore ? this.leaderboard.slice(5, 21).map(playerHtml) : ''}
    </tbody>`;
  }

  private renderHeader() {
    return html`<thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>✶</th>
      </tr>
    </thead>`;
  }

  onOpenMore() {
    this.showMore = !this.showMore;
  }
}

function playerHtml(player: LeaderboardEntry) {
  const sid = player.uid?.slice(0, 4) ?? '';
  return html`<tr>
    <td>${SP}${player.rank}${SP}</td>
    <td>${SP}${player.name}<span class="short-id">#${sid}</span>${SP}</td>
    <td>${SP}${formatSIInteger(player.score)}${SP}</td>
  </tr>`;
}
