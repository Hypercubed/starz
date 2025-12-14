import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from './controls.ts';
import { addMessage, clearMessages, updateMessageBox } from './messages.ts';
import {
  drawMap,
  rerender,
  centerOnHome,
  centerOnSystem,
  changeView,
  rotateProjection,
  scaleZoom
} from './render.ts';
import { clearSelection, deselect, select } from './selection.ts';
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  showStartGame,
  showEndGame,
  setupDialogs
} from './ui.ts';

export function setupUI() {
  drawMap();
  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  // Subscribe to updates
  globalThis.gameManager.events.on('STATE_UPDATED', () => {
    rerender();
    updateInfoBox();
    updateLeaderbox();
    updateMessageBox();
  });
}

export {
  showHelp,
  showStartGame,
  showEndGame,
  centerOnHome,
  setupDialogs,
  drawMap,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox,
  scaleZoom,
  rotateProjection,
  changeView,
  centerOnSystem,
  onClickLane,
  onClickSystem,
  setupKeboardControls,
  addMessage,
  clearMessages,
  rerender,
  select,
  clearSelection,
  deselect
};
