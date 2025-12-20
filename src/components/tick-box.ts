import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { gameManager } from './app-context';

import type { GameManager } from '../managers/manager';

@customElement('tick-box')
export class TickBoxElement extends LitElement {
  @consume({ context: gameManager, subscribe: true })
  @property({ attribute: false })
  gameManager!: GameManager;

  @property({ type: Number })
  protected tick: number = 0;

  connectedCallback() {
    super.connectedCallback();
    this.gameManager.events.on('GAME_TICK', ({ tick }) => {
      this.tick = tick ?? 0;
    });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const d = ~~(this.tick / 2);
    const p = this.tick % 2 === 1 ? '.' : '';
    return html`${d}${p}`;
  }
}
