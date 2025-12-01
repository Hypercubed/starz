import type { System, Lane, Coordinates } from '../src/types';
import { SystemTypes } from '../src/types';

/**
 * Creates a mock system for testing purposes
 */
export function createMockSystem(overrides: Partial<System> = {}): System {
  const defaultSystem: System = {
    id: '' + Math.floor(Math.random() * 10000),
    type: SystemTypes.UNINHABITED,
    location: [0, 0],
    ownerId: null,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null
  };

  return { ...defaultSystem, ...overrides };
}

/**
 * Creates a mock lane connecting two systems
 */
export function createMockLane(
  from: System,
  to: System,
  overrides: Partial<Lane> = {}
): Lane {
  const id = [from.id, to.id].sort((a: string, b: string) => a.localeCompare(b)).join('-');

  const defaultLane: Lane = {
    id,
    fromId: from.id,
    toId: to.id
  };

  return { ...defaultLane, ...overrides };
}

/**
 * Creates a mock coordinate pair
 */
export function createMockCoordinates(
  longitude = 0,
  latitude = 0
): Coordinates {
  return [longitude, latitude];
}

/**
 * Creates multiple connected systems for testing
 */
export function createConnectedSystems(count: number): {
  systems: System[];
  lanes: Lane[];
} {
  const systems: System[] = [];
  const lanes: Lane[] = [];

  for (let i = 0; i < count; i++) {
    const longitude = Math.random() * 360 - 180;
    const latitude = Math.random() * 180 - 90;

    systems.push(
      createMockSystem({
        id: '' + i,
        location: [longitude, latitude]
      })
    );
  }

  // Connect each system to the next one
  for (let i = 0; i < count - 1; i++) {
    const lane = createMockLane(systems[i], systems[i + 1]);
    lanes.push(lane);
  }

  return { systems, lanes };
}
