export const PLAYER = 1;

export const WIDTH = 750;
export const HEIGHT = 750;

export const PROJECTION = "Orthographic" as
  | "Orthographic"
  | "Stereographic"
  | "Mercator";

export const TICK_DURATION_MS = 500;
export const TICKS_PER_TURN = 2;
export const TICKS_PER_ROUND = 25;

export const SHIPS_PER_TURN = 1; // Ships produced per inhabited system per turn
export const SHIPS_PER_ROUND = 1; // Ships produced per system per round
export const MAX_SHIPS_PER_SYSTEM = 40; // Max ships for pre-spaceflight systems

export const ENABLE_FOG_OF_WAR = true; // Whether to enable fog of war

export const NumOfSystems = 384; // Number of systems
export const NumHumanPlayers = 1; // Number of human players (should be 1 or 0)
export const NumBots = 4; // Total number of players (must be < N * fracOccupied)
export const NumInhabited = Math.max(Math.floor(0.1 * NumOfSystems), NumBots); // Fraction of systems that are occupied at start

// Should be < SQRT(PI/NumOfSystems) to ensure spacing
export const MinDistanceBetweenSystems = Math.min(
  0.08,
  Math.sqrt(Math.PI / NumOfSystems),
); // Minimum distance between systems

export const EVENT_TRACKING_ENABLED = import.meta.env.PROD;
export const DEBUG_LOGGING_ENABLED = import.meta.env.DEV;
export const START_PAUSED = true;
