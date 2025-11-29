import type { GameManager } from './services/game-manager.ts';

import { LocalGameManager } from './services/local.ts';
// import { PlayroomGameManager } from './services/playroom.ts';

window.onload = async () => {
  const gameManager = new LocalGameManager();
  window.gameManager = gameManager;
  await gameManager.connect();
};

declare global {
  interface Window {
    gameManager: GameManager;
  }
}
