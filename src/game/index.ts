export * from './actions.ts';
export * from './engine.ts';
export * from './generate.ts';
export * from './state.ts';
export * from './world.ts';

import { generateMap } from './generate.ts';
import { initalState } from './state.ts';

import type { GameState } from './types.d.ts';
import type { FnContext } from '../managers/types.d.ts';

export function setup(ctx: FnContext): GameState {
  const state = initalState();
  generateMap({ ...ctx, S: state });
  return state;
}
