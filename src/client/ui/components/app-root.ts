import { provide } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { ENABLE_CHEATS } from '../../constants.ts';
import * as game from '../../game/index.ts';
import * as ui from '../index.ts';

import {
  configContext,
  gameContext,
  gameManager,
  playerContext,
  stateContext
} from './app-context.ts';
import rootHtml from './app-root.html?raw';

const ROTATION_STEP = 5;

import type { GameConfig, GameState } from '../../game/types';
import type { GameContext } from '../../managers/types';
import type { Player } from '../../types';
import { githubIcon } from './icons.ts';
import type { LocalGameManager } from '../../managers/local.ts';

@customElement('app-root')
export class AppRootElement extends LitElement {
  @provide({ context: gameManager })
  @property({ attribute: false })
  gameManager!: LocalGameManager;

  @provide({ context: configContext })
  @state()
  protected config!: GameConfig;

  @provide({ context: stateContext })
  @state()
  protected state!: GameState;

  @provide({ context: playerContext })
  @state()
  protected player!: Player | null;

  @provide({ context: gameContext })
  @state()
  protected context!: GameContext;

  @query('#helpDialog')
  private helpDialog!: HTMLDialogElement;

  @query('#startDialog')
  private startDialog!: HTMLDialogElement;

  @query('#endDialog')
  private endDialog!: HTMLDialogElement;

  async connectedCallback() {
    super.connectedCallback();

    this.#setupEvents();
    this.#setupListeners();
  }

  createRenderRoot() {
    return this;
  }

  render() {
    // Replace this once everything is a component
    return html`
      <dialog id="startDialog" closedby="none">
        <start-dialog-content
          @startClicked=${this.onStart}
        ></start-dialog-content>
      </dialog>
      <dialog id="endDialog">
        <p id="endMessage"></p>
        <form method="dialog">
          <button id="restartButton">Yes</button>
        </form>
      </dialog>
      <dialog id="helpDialog">${this.renderHelp()}</dialog>
      ${unsafeHTML(rootHtml)}
      <game-canvas id="app"></game-canvas>
      <tick-box tick="${this.context?.tick}"></tick-box>
      <leaderboard-element></leaderboard-element>
      <message-box></message-box>
      <button id="helpButton" @click=${this.showHelp}>?</button>
    `;
  }

  renderHelp() {
    return html`<article>
      <h2>Introduction</h2>

      <p>
        This is a simple strategy game where you control a number of star
        systems and try to conquer the the Bubble. The Bubble is a cluster of
        star systems connected by hyperspace lanes. You start with one system
        and must expand your control by sending ships to capture other systems.
      </p>

      <h3>Gameplay</h3>
      <ul>
        <li>
          The game is played in real-time, with each turn lasting 1 second.
        </li>
        <li>You begin the game controlling one system, your homeworld.</li>
        <li>
          Each turn, your homeworld and any other inhabited systems you control,
          will produce an additional ship.
        </li>
        <li>You can send these ships to other systems to capture them.</li>
        <li>
          Each controlled system receives an additional ship each 25 turns.
        </li>
        <li>
          To transfer ships, left click on a system you control and then right
          click on a target system.
        </li>
        <li>
          This will send all available ships, less one, from the source system
          to the target system.
        </li>
        <li>
          Right click on the hyperspace lane between the systems to send half of
          the available ships.
        </li>
        <li>
          If the target system is uninhabited, you will capture it
          automatically.
        </li>
        <li>
          If the target system is controlled by another player, a battle will
          ensue.
        </li>
        <li>
          The player with the most ships on the target system after all ships
          have arrived will take control of the system.
        </li>
      </ul>
      <h3>Objective</h3>
      <p>
        The goal is to eliminate all other player's homeworlds and control the
        entire Bubble.
      </p>

      <p>
        <a href="https://github.com/Hypercubed/starz">
          ${unsafeHTML(githubIcon)}
        </a>
      </p>

      <form method="dialog">
        <button>Exit</button>
      </form>
    </article>`;
  }

  #setupEvents() {
    window.document.addEventListener('keyup', (e: KeyboardEvent) =>
      this.onKeyup(e)
    );
    window.document.addEventListener('keypress', (e: KeyboardEvent) =>
      this.onKeypress(e)
    );
  }

  #setupListeners() {
    this.config = this.gameManager.getConfig();
    this.state = this.gameManager.getState();
    this.player = this.gameManager.getPlayer();
    this.context = this.gameManager.getContext();

    this.gameManager.on('GAME_INIT', () => {
      this.config = this.gameManager.getConfig();
      this.state = this.gameManager.getState();
      this.player = this.gameManager.getPlayer();
      this.context = this.gameManager.getContext();
    });

    this.gameManager.on('CONFIG_UPDATED', ({ config }) => {
      this.config = config;
      this.player = this.gameManager.getPlayer();
      this.context = this.gameManager.getContext();
    });

    this.gameManager.on('STATE_UPDATED', ({ state }) => (this.state = state));

    this.gameManager.on('GAME_TICK', () => {
      this.context = this.gameManager.getContext();
    });
  }

  showStartDialog() {
    this.startDialog?.showModal();
  }

  private onStart() {
    this.startDialog.close();
    this.gameManager.start();
  }

  private async onKeyup(event: KeyboardEvent) {
    const tagName = (event.target as HTMLElement)?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

    switch (event.key) {
      case '?':
        this.showHelp();
        return;
      case 'Escape':
        ui.clearSelection();
        ui.requestRerender();
        return;
      case 'x': {
        if (!event.ctrlKey) return;
        this.gameManager.quit();
        return;
      }
    }

    if (ENABLE_CHEATS && event.altKey) {
      event.preventDefault();

      const { S, C, E } = globalThis.gameManager.getFnContext();

      switch (event.code) {
        case 'KeyC':
          for (const system of S.world.systemMap.values()) {
            if (system.ownerId === C.playerId) {
              system.ships *= 2;
            }
          }
          ui.requestRerender();
          return;
        case 'KeyR':
          game.revealAllSystems(S);
          ui.requestRerender();
          return;
        case 'NumpadAdd':
        case 'Equal': {
          const timeScale = Math.min(16, C.config.timeScale * 2);
          globalThis.gameManager.setConfig({ timeScale });
          E.emit('LOG', {
            message: `Time scale increased to ${C.config.timeScale}x`
          });
          return;
        }
        case 'NumpadSubtract':
        case 'Minus': {
          const timeScale = Math.max(0.25, C.config.timeScale / 2);
          globalThis.gameManager.setConfig({ timeScale });
          E.emit('LOG', {
            message: `Time scale decreased by ${C.config.timeScale}x`
          });
          return;
        }
      }
    }
  }

  private async onKeypress(event: KeyboardEvent) {
    const tagName = (event.target as HTMLElement)?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

    switch (event.code) {
      case 'Space':
        if ('pauseToggle' in globalThis.gameManager) {
          (globalThis.gameManager.pauseToggle as () => void)();
        }
        return;
      case 'Equal':
      case 'NumpadAdd':
        ui.scaleZoom(1.2);
        ui.requestRerender();
        return;
      case 'Minus':
      case 'NumpadSubtract':
        ui.scaleZoom(0.8);
        ui.requestRerender();
        return;
      case 'KeyW':
        ui.rotateProjection([0, ROTATION_STEP]);
        ui.requestRerender();
        return;
      case 'KeyA':
        ui.rotateProjection([-ROTATION_STEP, 0]);
        ui.requestRerender();
        return;
      case 'KeyS':
        ui.rotateProjection([0, -ROTATION_STEP]);
        ui.requestRerender();
        return;
      case 'KeyD':
        ui.rotateProjection([ROTATION_STEP, 0]);
        ui.requestRerender();
        return;
      case 'KeyQ':
        ui.rotateProjection([0, 0, ROTATION_STEP]);
        ui.requestRerender();
        break;
      case 'KeyE':
        ui.rotateProjection([0, 0, -ROTATION_STEP]);
        ui.requestRerender();
        break;
      case 'KeyH':
        ui.centerOnHome();
        ui.requestRerender();
        return;
      case 'KeyC':
        if (ui.selection.last) {
          ui.centerOnSystem(ui.selection.last);
          ui.requestRerender();
        }
        return;
      case 'KeyP':
        ui.changeView();
        ui.centerOnHome();
        ui.requestRerender();
        return;
    }
  }

  private showHelp() {
    this.helpDialog.showModal();
  }

  async showEndGame(message: string) {
    this.endDialog.showModal();
    this.endDialog.querySelector('p#endMessage')!.textContent = message;

    return new Promise<boolean>((resolve) => {
      this.endDialog.addEventListener('close', () => resolve(true));
      this.endDialog.addEventListener('cancel', () => resolve(false));
    });
  }
}
