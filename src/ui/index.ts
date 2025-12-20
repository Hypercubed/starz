import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from './controls.ts';
import { addMessage, clearMessages } from './messages.ts';
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
  showStartGame,
  showEndGame,
  setupDialogs,
  openOptions
} from './ui.ts';

// TODO: This shoudl become a component
export function setupUI() {
  drawMap();

  // Subscribe to updates
  globalThis.gameManager.events.on('STATE_UPDATED', () => {
    rerender();
  });
}

export {
  showHelp,
  showStartGame,
  showEndGame,
  centerOnHome,
  setupDialogs,
  drawMap,
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
  deselect,
  openOptions
};
