import * as d3 from "d3";
import { pauseToggle } from "./engine";
import { centerOnSystem, changeView, rerender } from "./render";
import { addMessage, state } from "./state";
import { revealSystem } from "./actions";
import { PLAYER } from "./constants";
import { showHelp } from "./ui";

export function setupControls() {
  d3.select("body").on("keypress", null);

  d3.select("body").on("keypress", (event) => {
    switch (event.key) {
      case " ":
        pauseToggle();
        break;
      case "r":
        centerOnSystem(state.systems[0]);
        break;
      case "c":
        if (state.lastSelectedSystem) {
          centerOnSystem(state.lastSelectedSystem);
        }
        break;
      case "R":
        state.systems.forEach(revealSystem);
        rerender();
        break;
      case "+":
        state.timeScale = Math.min(16, state.timeScale * 2);
        break;
      case "-":
        state.timeScale = Math.max(0.25, state.timeScale / 2);
        break;
      case "C":
        state.systems.forEach((system) => {
          if (system.owner === PLAYER) {
            system.ships *= 2;
          }
        });
        rerender();
        break;
      case "t":
        addMessage(`Current Tick: ${state.tick}`);
        break;
      case "?":
        showHelp();
        break;
      case "p":
        changeView();
        centerOnSystem(state.systems[0]);
        rerender();
        break;
      // case 's':
      //   startNewGame();
      //   break;
    }
  });
}
