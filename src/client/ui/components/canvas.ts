import { consume } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import * as ui from '../index.ts';

import { gameManager } from './app-context.ts';

import type { GameManager } from '../../managers/manager.ts';
import { GameEvents } from '../../game/shared.ts';

@customElement('game-canvas')
export class GameCanvas extends LitElement {
  @consume({ context: gameManager })
  @state()
  gameManager!: GameManager;

  connectedCallback() {
    super.connectedCallback();

    this.gameManager.events.on(GameEvents.GAME_START, () => {
      ui.drawMap(
        document.getElementById('app')!,
        this.gameManager.getFnContext()
      );
    });

    this.gameManager.events.on(GameEvents.STATE_UPDATED, () => {
      ui.requestRerender();
    });

    this.gameManager.events.on(GameEvents.GAME_TICK, () => {
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
