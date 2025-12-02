import { LocalGameManager } from './managers/local.ts';
// import { PlayroomGameManager } from './managers/playroom.ts';

globalThis.onload = async () => {
  const gameManager = new LocalGameManager();
  globalThis.gameManager = gameManager;
  await gameManager.connect();
};
