import type { GameManager } from './managers/manager';

declare global {
  var gameManager: GameManager;

  interface Window {
    sa_event?: (eventName: string, properties?: Record<string, any>) => void;
  }
}
