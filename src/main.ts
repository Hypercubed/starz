import "./style.css";

import { centerOnHome, drawMap, rerender } from "./render";
import { resetState, state } from "./state";
import { generateMap } from "./generate";
import { revealSystem } from "./actions";
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox,
} from "./ui";
import { runGameLoop, startGame, stopGame } from "./engine";
import { setupControls } from "./controls";

window.onload = () => {
  const helpButton = document.getElementById("helpButton") as HTMLButtonElement;
  helpButton.addEventListener("click", () => {
    showHelp();
  });

  const startDialog = document.getElementById(
    "startDialog",
  ) as HTMLDialogElement;
  // startDialog.showModal();

  const startButton = document.getElementById(
    "startButton",
  ) as HTMLButtonElement;
  startButton.addEventListener("click", () => {
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

  setupControls();

  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  startGame();
}
