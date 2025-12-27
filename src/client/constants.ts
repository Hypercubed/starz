export const WIDTH = 750;
export const HEIGHT = 750;

export const PROJECTION = 'Orthographic' as
  | 'Orthographic'
  | 'Stereographic'
  | 'Mercator';

export const TICK_DURATION_MS = 500;
export const TICKS_PER_TURN = 2;
export const TICKS_PER_ROUND = 25;

export const SHIPS_PER_TURN = 1; // Ships produced per inhabited system per turn
export const SHIPS_PER_ROUND = 1; // Ships produced per system per round
export const MAX_SHIPS_PER_SYSTEM = 40; // Max ships for pre-spaceflight systems

export const ENABLE_FOG_OF_WAR = true; // Whether to enable fog of war

export const NumOfSystems = 384; // Number of systems
export const MAX_HUMAN_PLAYERS = 1; // Number of human players (should be 1 or 0)
export const MAX_BOTS = 8; // Total number of players (must be < N * fracOccupied)
export const MAX_PLAYERS = MAX_HUMAN_PLAYERS + MAX_BOTS;

export const FP = 0.1; // Fraction of systems that are occupied at start
// export const PC = 0.15; // Probability of an inhabited system being a homeworld (per tick)

const env = (import.meta as any).env || {};

export const DEV_MODE = env.DEV ?? true;
export const PROD_MODE = env.PROD ?? false;

export const EVENT_TRACKING_ENABLED = PROD_MODE;
export const DEBUG_LOGGING_ENABLED = DEV_MODE;
export const START_PAUSED = true;
export const ENABLE_CHEATS = DEV_MODE;
export const ENABLE_BOT_CONTROL = false;
export const ENABLE_GRATICULE = true;
