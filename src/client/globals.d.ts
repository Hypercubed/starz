import type { GameManager } from './managers/classes/manager';

declare global {
  var gameManager: GameManager;
  var __APP_VERSION__: string;

  interface Window {
    sa_event?: (eventName: string, properties?: Record<string, any>) => void;
  }
}
