import { consume } from '@lit/context';
import * as d3 from 'd3';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../managers/manager.ts';
import type { Player } from '../types.d.ts';

const formatSIInteger = d3.format('.3~s');

@customElement('leaderboard-element')
export class LeaderboardElement extends LitElement {
  @consume({ context: gameManager, subscribe: true })
  @property({ attribute: false })
  gameManager!: GameManager;

  @property()
  protected stats: Player[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.gameManager.events.on('STATE_UPDATED', ({ state }) => {
      const players = Array.from(state.playerMap.values());
      this.stats = players.sort(
        (a, b) =>
          b.stats.systems - a.stats.systems || b.stats.ships - a.stats.ships
      );
    });
  }

  createRenderRoot() {
    return this;
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
      ${this.stats.map(
        (player) =>
          html`<tr
            style="--owner-color: ${player.color || null}"
            title="${player.bot ? player.bot.name : 'Human'}"
            class="${!player.isAlive ? 'eliminated' : ''}"
          >
            <td>${SP}${player.name}${SP}</td>
            <td>${SP}${player.stats.systems}${SP}</td>
            <td>${SP}${formatSIInteger(player.stats.ships)}${SP}</td>
          </tr>`
      )}
    </tbody>`;
  }

  private renderHeader() {
    return html`<thead>
        <tr>
          <th>Player</th>
          <th>Systems</th>
          <th>Ships</th>
        </tr>
      </thead>
      <tbody></tbody>`;
  }
}
