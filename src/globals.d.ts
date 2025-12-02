import type { GameManager } from './managers/manager.ts';

declare global {
  var gameManager: GameManager;
}
