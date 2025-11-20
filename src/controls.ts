import * as d3 from "d3";
import { pauseToggle } from "./engine";
import {
  centerOnHome,
  centerOnSystem,
  changeView,
  rerender,
  rotateProjection,
} from "./render";
import { state } from "./state";
import { revealSystem } from "./actions";
import { PLAYER } from "./constants";
import { showHelp } from "./ui";
import { debugLog } from "./logging";

const ROTATION_STEP = 5;

export function setupControls() {
  d3.select("body").on("keypress", null);

  d3.select("body").on("keypress", (event) => {
    switch (event.key) {
      case " ":
        pauseToggle();
        break;
      case "h":
        centerOnHome();
        rerender();
        break;
      case "c":
        if (state.lastSelectedSystem) {
          centerOnSystem(state.lastSelectedSystem);
          rerender();
        }
        break;
      case "R":
        state.systems.forEach(revealSystem);
        rerender();
        break;
      case "+":
        state.timeScale = Math.min(16, state.timeScale * 2);
        debugLog(`Time scale increased to ${state.timeScale}x`);
        break;
      case "-":
        state.timeScale = Math.max(0.25, state.timeScale / 2);
        debugLog(`Time scale decreased to ${state.timeScale}x`);
        break;
      case "C":
        state.systems.forEach((system) => {
          if (system.owner === PLAYER) {
            system.ships *= 2;
          }
        });
        rerender();
        break;
      case "?":
        showHelp();
        break;
      case "p":
        changeView();
        centerOnHome();
        rerender();
        break;
      case "w":
        rotateProjection([0, ROTATION_STEP]);
        rerender();
        break;
      case "a":
        rotateProjection([-ROTATION_STEP, 0]);
        rerender();
        break;
      case "s":
        rotateProjection([0, -ROTATION_STEP]);
        rerender();
        break;
      case "d":
        rotateProjection([ROTATION_STEP, 0]);
        rerender();
        break;
      case "q":
        rotateProjection([0, 0, ROTATION_STEP]);
        rerender();
        break;
      case "e":
        rotateProjection([0, 0, -ROTATION_STEP]);
        rerender();
        break;
      // case 's':
      //   startNewGame();
      //   break;
    }
  });
}
