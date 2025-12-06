import { debounce } from 'ts-debounce';
import {
  drawMap,
  rerender as _rerender,
  centerOnHome,
  centerOnSystem,
  changeView,
  rotateProjection,
  scaleZoom
} from './render.ts';
import {
  showHelp,
  updateInfoBox,
  updateLeaderbox,
  updateMessageBox,
  showStartGame,
  showEndGame,
  setupDialogs
} from './ui.ts';
import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from './controls.ts';

import { eventBus } from '../events/index.ts';

export const rerender = debounce(_rerender, 16);

export function setupUI() {
  drawMap();
  updateInfoBox();
  updateLeaderbox();
  updateMessageBox();

  // Subscribe to updates
  eventBus.on('STATE_UPDATED', () => {
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
  setupKeboardControls
};
