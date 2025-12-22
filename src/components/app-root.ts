import { provide } from '@lit/context';
import { LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { PlaykitGameManager } from '../managers/playkit.ts';

import { gameManager } from './app-context.ts';
// import { FirebaseGameManager } from '../managers/firebase.ts';
// import { LocalGameManager } from '../managers/local.ts';
// import { ConvexGameManager } from '../managers/convex.ts';
// import { PlayroomGameManager } from '../managers/playroom.ts';

@customElement('app-root')
export class AppRootElement extends LitElement {
  @provide({ context: gameManager })
  @state()
  private gameManager = new PlaykitGameManager();

  connectedCallback() {
    super.connectedCallback();
    // console.log('Initialized game manager:', this.gameManager);
    globalThis.gameManager = this.gameManager;
    this.gameManager.connect();
  }

  createRenderRoot() {
    return this;
  }
}
