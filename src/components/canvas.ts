import { consume } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import * as ui from '../ui/index.ts';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../managers/manager.ts';

@customElement('game-canvas')
export class GameCanvas extends LitElement {
  @consume({ context: gameManager, subscribe: true })
  @property({ attribute: false })
  gameManager!: GameManager;

  connectedCallback() {
    super.connectedCallback();

    this.gameManager.events.on('GAME_START', () => {
      ui.drawMap(
        document.getElementById('app')!,
        this.gameManager.getContext()
      );
    });

    this.gameManager.events.on('STATE_UPDATED', () => {
      ui.requestRerender();
    });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <canvas></canvas>
      <svg></svg>
    `;
  }
}
