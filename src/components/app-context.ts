import { createContext } from '@lit/context';

import type { GameManager } from '../managers/manager';

export const gameManager = createContext<GameManager>(Symbol('game-manager'));
