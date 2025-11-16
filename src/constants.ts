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

export const NumOfSystems = 400; // Number of systems
export const NumInhabited = Math.floor(0.1 * NumOfSystems); // Fraction of systems that are occupied at start
export const NumHumanPlayers = 1; // Number of human players (should be 1 or 0)
export const NumBots = 4; // Total number of players (must be < N * fracOccupied)

// Should be < SQRT(PI/NumOfSystems) to ensure spacing
export const MinDistanceBetweenSystems = Math.min(
  0.08,
  Math.sqrt(Math.PI / NumOfSystems),
); // Minimum distance between systems

export const EVENT_TRACKING_ENABLED = true;
