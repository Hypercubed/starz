import '../render/style.css';
import type { GameManager } from '../services/game-manager.ts';

import { LocalGameManager } from '../services/local.ts';
// import { PlayroomGameManager } from '../services/playroom.ts';

window.onload = async () => {
  const gameManager = new LocalGameManager();
  await gameManager.connect();
  window.gameManager = gameManager;
};

declare global {
  interface Window {
    gameManager: GameManager;
  }
}
