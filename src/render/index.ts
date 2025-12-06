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
import type { FnContext } from '../managers/types.ts';
import type { GameState } from '../game/types.ts';
import {
  onClickLane,
  onClickSystem,
  setupKeboardControls
} from './controls.ts';

export function setupUI(ctx: FnContext) {
  drawMap(ctx);
  updateInfoBox(ctx.G);
  updateLeaderbox(ctx.G);
  updateMessageBox(ctx.G);
}

export function updateUI(state: GameState) {
  updateInfoBox(state);
  updateLeaderbox(state);
  updateMessageBox(state);
}

export const rerender = debounce(_rerender, 16);

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
