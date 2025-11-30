import type { GameManager } from './managers/manager.ts';

import { LocalGameManager } from './managers/local.ts';
// import { PlayroomGameManager } from './managers/playroom.ts';

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
