import '../render/style.css';

import { centerOnHome, drawMap, rerender } from '../render/render';
import { resetState, state } from '../game/state';
import { generateMap } from '../game/generate';
import { revealSystem } from '../game/actions';
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox
} from '../render/ui';
import { runGameLoop, startGame, stopGame } from './engine';
import { setupKeboardControls } from '../input/controls';

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
