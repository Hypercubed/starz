import type { GameManager } from './managers/manager';

declare global {
  var gameManager: GameManager;
}
