import { consume } from '@lit/context';
import * as d3 from 'd3';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../../managers/classes/manager.ts';
import type { Player } from '../../types';

const formatSIInteger = d3.format('.3~s');

@customElement('leaderboard-element')
export class LeaderboardElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: GameManager;

  @state()
  private stats!: Player[];

  createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.gameManager.on('GAME_TICK', () => this.updateStats());
    this.gameManager.on('STATE_UPDATED', () => this.updateStats());
  }

  private updateStats() {
    const playerMap = this.gameManager.getState()?.playerMap;
    if (!playerMap) return;

    this.stats = Array.from(playerMap.values()).sort(
      (a, b) =>
        b.stats.systems - a.stats.systems || b.stats.ships - a.stats.ships
    );
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
      ${this.stats?.map(
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
