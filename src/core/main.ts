import '../render/style.css';

import { centerOnHome, drawMap, rerender } from '../render/render.ts';
import { resetState, state } from '../game/state.ts';
import { generateMap } from '../game/generate.ts';
import { revealSystem } from '../game/actions.ts';
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox
} from '../render/ui.ts';
import { runGameLoop, startGame, stopGame } from './engine.ts';
import { setupKeboardControls } from '../input/controls.ts';

window.onload = () => {
  const helpButton = document.getElementById('helpButton') as HTMLButtonElement;
  helpButton.addEventListener('click', () => {
    showHelp();
  });

  const startDialog = document.getElementById(
    'startDialog'
  ) as HTMLDialogElement;
  // startDialog.showModal();

  const startButton = document.getElementById(
    'startButton'
  ) as HTMLButtonElement;
  startButton.addEventListener('click', () => {
    startDialog.close();
    runGameLoop();
  });

  startNewGame();
};

function startNewGame() {
  stopGame();

  resetState();
  generateMap();
  drawMap();

  revealSystem(state.systems[0]);
  centerOnHome();
  rerender();

  setupKeboardControls();

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  startGame();
}
