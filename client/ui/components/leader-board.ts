import { consume } from '@lit/context';
import * as d3 from 'd3';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { stateContext } from './app-context.ts';

import type { GameState } from '../../game/types';

const formatSIInteger = d3.format('.3~s');

@customElement('leaderboard-element')
export class LeaderboardElement extends LitElement {
  @consume({ context: stateContext, subscribe: true })
  @state()
  state!: GameState;

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
    const stats = Array.from(this.state.playerMap.values()).sort(
      (a, b) =>
        b.stats.systems - a.stats.systems || b.stats.ships - a.stats.ships
    );

    const SP = ' '; // non-breaking space
    return html`<tbody>
      ${stats.map(
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
