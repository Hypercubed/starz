import '@picocss/pico/css/pico.zinc.min.css';

import { version } from '../../package.json';
import './ui/components/index.ts';

import { PartykitGameManager } from './managers/partykit.ts';
// import { LocalGameManager } from './managers/local.ts';
// import { PlayroomGameManager } from './managers/playroom.ts';

import type { AppRootElement } from './ui/components/app-root.ts';

const appRoot = document.createElement('app-root') as AppRootElement;

const gameManager = new PartykitGameManager();
globalThis.gameManager = gameManager;
appRoot.gameManager = gameManager;

document.body.appendChild(appRoot);

gameManager.mount(appRoot);

console.log(`starz.io version ${version}`);
gameManager.connect();
