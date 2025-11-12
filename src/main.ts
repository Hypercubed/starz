import './style.css';

import { centerOnSystem, drawMap } from './render';
import { addMessage, resetState, state } from './state';
import { generateMap } from './generate';
import { PLAYER } from './constants';
import { revealSystem } from './actions';
import { createInfoBox, createLeaderbox, createMessageBox, updateInfoBox, updateLeaderbox, updateMessageBox } from './ui';
import { startGame, stopGame } from './engine';
import { setupControls } from './controls';

window.onload = () => {
  startNewGame();
};

function startNewGame() {
  stopGame();

  resetState();
  generateMap();
  drawMap();

  revealSystem(state.systems[0]);
  centerOnSystem(state.systems[0]);
  
  setupControls();

  addMessage(`Game started. You are Player ${PLAYER}.`);

  createInfoBox();
  updateInfoBox();
  createLeaderbox();
  updateLeaderbox();
  createMessageBox();
  updateMessageBox();
  
  startGame();
}
