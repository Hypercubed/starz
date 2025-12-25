import { createContext } from '@lit/context';

import { GameManager } from '../../managers/manager';

import type { GameConfig, GameState } from '../../game/types';
import type { GameContext } from '../../managers/types';
import type { Player } from '../../types';

export const gameManager = createContext<GameManager>(GameManager);
export const configContext = createContext<GameConfig>(Symbol('config'));
export const stateContext = createContext<GameState>(Symbol('state'));
export const playerContext = createContext<Player>(Symbol('player'));
export const gameContext = createContext<GameContext>(Symbol('context'));
