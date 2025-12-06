import { version } from '../package.json';

// import { BGIOGameManager } from './managers/boardgameio.ts';
import { LocalGameManager } from './managers/local.ts';
// import { PlayroomGameManager } from './managers/playroom.ts';

console.log(`starz.io version ${version}`);

globalThis.onload = async () => {
  const gameManager = new LocalGameManager();
  globalThis.gameManager = gameManager;
  await gameManager.connect();
};
