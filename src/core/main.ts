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
  const endDialog = document.getElementById('endDialog') as HTMLDialogElement;
  const startDialog = document.getElementById(
    'startDialog'
  ) as HTMLDialogElement;

  const helpButton = document.getElementById('helpButton') as HTMLButtonElement;
  const startButton = document.getElementById(
    'startButton'
  ) as HTMLButtonElement;
  const restartButton = document.getElementById(
    'restartButton'
  ) as HTMLButtonElement;

  helpButton.addEventListener('click', showHelp);

  startButton.addEventListener('click', () => {
    startDialog.close();
    runGameLoop();
  });

  restartButton.addEventListener('click', () => {
    endDialog.close();
    startNewGame();
    runGameLoop();
  });

  startNewGame();
};

function startNewGame() {
  stopGame();

  resetState();
  generateMap();
  drawMap();

  revealSystem(state.world.systems[0]);
  centerOnHome();
  rerender();

  setupKeboardControls();

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  startGame();
}
