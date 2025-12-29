import { consume } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { gameManager } from './app-context.ts';

import type { Messages } from '../../types';
import type { LocalGameManager } from '../../managers/local.ts';

@customElement('message-box')
export class MessageBoxElement extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: LocalGameManager;

  @state()
  protected messages: Messages[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.gameManager.on('ADD_MESSAGE', (message) => {
      this.messages = [...this.messages, { message, tick: 0 }];
    });
    this.gameManager.on('CLEAR_MESSAGES', () => {
      this.messages = [];
    });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    if (this.messages.length > 0) {
      const messages = this.messages.slice(-5);
      return html`${messages.map((msg) => {
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
