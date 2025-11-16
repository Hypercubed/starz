import "./style.css";

import { centerOnHome, drawMap, rerender } from "./render";
import { addMessage, resetState, state } from "./state";
import { generateMap } from "./generate";
import { PLAYER } from "./constants";
import { revealSystem } from "./actions";
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox,
} from "./ui";
import { startGame, stopGame } from "./engine";
import { setupControls } from "./controls";

window.onload = () => {
  const helpButton = document.getElementById("helpButton") as HTMLButtonElement;
  helpButton.onclick = () => {
    showHelp();
  };

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

  setupControls();

  addMessage(`Game started. You are Player ${PLAYER}.`);

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  startGame();
}
