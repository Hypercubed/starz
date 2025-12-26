import { consume } from '@lit/context';
import * as d3 from 'd3';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../../managers/manager.ts';
import { PartykitGameManager } from '../../managers/partykit.ts';
import type { LeaderboardEntry } from '../../../server/types';

const formatSIInteger = d3.format('.3~s');

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

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    if (this.gameManager instanceof PartykitGameManager) {
      this.leaderboard = await (
        this.gameManager as PartykitGameManager
      ).loadLeaderboard();
      this.gameManager.events.on('GAME_INIT', async () => {
        this.leaderboard = await (
          this.gameManager as PartykitGameManager
        ).loadLeaderboard();
        this.requestUpdate();
      });
    }
  }

  render() {
    return html`
      <table id="leaderbox">
        ${this.renderHeader()} ${this.renderBody()}
      </table>
    `;
  }

  private renderBody() {
    const SP = ' '; // non-breaking space
    return html`<tbody>
      ${this.leaderboard.map((player) => {
        const sid = player.uid?.slice(0, 4) ?? '';
        return html`<tr>
          <td>${SP}${player.rank}${SP}</td>
          <td>${SP}${player.name}<span class="short-id">#${sid}</span>${SP}</td>
          <td>${SP}${formatSIInteger(player.score)}${SP}</td>
        </tr>`;
      })}
    </tbody>`;
  }

  private renderHeader() {
    return html`<thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>✶</th>
        </tr>
      </thead>
      <tbody></tbody>`;
  }
}
