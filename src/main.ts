import "./style.css";

import { centerOnSystem, drawMap } from "./render";
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
  centerOnSystem(state.systems[0]);

  setupControls();

  addMessage(`Game started. You are Player ${PLAYER}.`);

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  startGame();
}
