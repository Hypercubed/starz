import { EventBus } from './EventBus.ts';
import type { GameEventMap } from './types.ts';

export const eventBus = new EventBus<GameEventMap>();

export * from './types.ts';
export * from './EventBus.ts';
