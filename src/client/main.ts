import { version } from '../../package.json';
import './ui/components/index.ts';
import type { LocalGameManager } from './managers/local.ts';

import type { AppRootElement } from './ui/components/app-root.ts';

// Dynamically import the appropriate GameManager based on environment variable
// VITE_MANAGER can be "PartykitGameManager", "PlayroomGameManager", or "LocalGameManager" (default)
// Other managers are not built into the client bundle to reduce size
async function getGameManager(): Promise<LocalGameManager> {
  switch (import.meta.env.VITE_MANAGER) {
    case 'PartykitGameManager':
      return await import('./managers/partykit.ts').then(
        ({ PartykitGameManager }) => new PartykitGameManager()
      );
    case 'PlayroomGameManager':
      return await import('./managers/playroom.ts').then(
        ({ PlayroomGameManager }) => new PlayroomGameManager()
      );
    default:
      return await import('./managers/local.ts').then(
        ({ LocalGameManager }) => new LocalGameManager()
      );
  }
}

const appRoot = document.createElement('app-root') as AppRootElement;

const gameManager = await getGameManager();
globalThis.gameManager = gameManager;
appRoot.gameManager = gameManager;

document.body.appendChild(appRoot);

gameManager.mount(appRoot);

console.log(`starz.io version ${version}`);
gameManager.connect();
