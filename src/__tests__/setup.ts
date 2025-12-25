import { SimGameManager } from '../client/managers/simulation.ts';

import type { Coordinates, Lane, System } from '../client/game/types';
import type { Player } from '../client/types';

export function createMockManager() {
  const manager = new SimGameManager();

  // @ts-ignore
  globalThis['gameManager'] = manager;

  // TODO: Set RNG?

  manager.setConfig({
    numBots: 0,
    numSystems: 48
  });

  const player = createMockPlayer({ id: '1', name: 'Player 1' });

  manager['state'] = manager['game'].initalState();
  manager['state'].world = createMockWorld();
  manager['state'].playerMap.set(player.id, player);

  manager['playerId'] = '1';

  return manager;
}

/**
 * Creates a mock system for testing purposes
 */
export function createMockSystem(overrides: Partial<System> = {}): System {
  const defaultSystem: System = {
    id: '' + Math.floor(Math.random() * 10000),
    type: 'UNINHABITED',
    location: [0, 0],
    ownerId: null,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null,
    movement: [0, 0]
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
  const id = [from.id, to.id]
    .sort((a: string, b: string) => a.localeCompare(b))
    .join('-');

  const defaultLane: Lane = {
    id,
    fromId: from.id,
    toId: to.id,
    movement: [0, 0]
  };

  return { ...defaultLane, ...overrides };
}

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const defaultPlayer: Player = {
    id: '' + Math.floor(Math.random() * 10000),
    name: 'Mock Player',
    bot: undefined,
    color: '#FFFFFF',
    revealedSystems: new Set<string>(),
    visitedSystems: new Set<string>(),
    isAlive: true,
    stats: {
      playerId: '',
      systems: 0,
      ships: 0,
      homeworld: 0
    }
  };

  return { ...defaultPlayer, ...overrides };
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

export function createMockWorld() {
  const system1 = createMockSystem({
    id: '1',
    location: createMockCoordinates()
  });
  const system2 = createMockSystem({
    id: '2',
    location: createMockCoordinates(),
    ships: 10
  });
  const system3 = createMockSystem({
    id: '3',
    location: createMockCoordinates(),
    ships: 5
  });
  const lane = createMockLane(system1, system2);

  return {
    systemMap: new Map<string, System>([
      [system1.id, system1],
      [system2.id, system2],
      [system3.id, system3]
    ]),
    laneMap: new Map<string, Lane>([[lane.id, lane]]),
    neighborMap: new Map<string, Array<string>>([
      [system1.id, [system2.id]],
      [system2.id, [system1.id]]
    ])
  };
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
