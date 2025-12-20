import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../managers/manager.ts';
import type { Messages } from '../types.d.ts';

@customElement('message-box')
export class MessageBoxElement extends LitElement {
  @consume({ context: gameManager, subscribe: true })
  @property({ attribute: false })
  gameManager!: GameManager;

  @property()
  protected messages: Messages[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.gameManager.events.on('MESSAGES_UPDATED', ({ messages }) => {
      this.messages = (messages ?? []).slice(-5);
    });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    if (this.messages.length > 0) {
      return html`${this.messages.map((msg) => {
        const d = ~~(msg.tick / 2);
        const p = msg.tick % 2 === 1 ? '.' : '';
        return html`<div>
          ${unsafeHTML(msg.message)} <small>${d}${p}</small>
        </div>`;
      })}`;
    }
    return html``;
  }
}
