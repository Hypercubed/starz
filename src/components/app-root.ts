import { provide } from '@lit/context';
import { LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { version } from '../../package.json';
import { LocalGameManager } from '../managers/local.ts';

import { gameManager } from './app-context.ts';

// import { ConvexGameManager } from '../managers/convex.ts';
// import { PlayroomGameManager } from '../managers/playroom.ts';

@customElement('app-root')
export class AppRootElement extends LitElement {
  @provide({ context: gameManager })
  @state()
  private gameManager = new LocalGameManager();

  connectedCallback() {
    super.connectedCallback();
    console.log(`starz.io version ${version}`);
    // console.log('Initialized game manager:', this.gameManager);
    globalThis.gameManager = this.gameManager;

    this.gameManager.connect();
  }

  createRenderRoot() {
    return this;
  }
}
