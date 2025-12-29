import * as d3 from 'd3';
import { nanoid } from 'nanoid';

import {
  HEIGHT,
  MAX_SHIPS_PER_SYSTEM,
  FP,
  MAX_HUMAN_PLAYERS,
  MAX_BOTS
} from '../constants.ts';

import {
  addLane,
  addSystem,
  buildNeighborMap,
  createWorld,
  findClosestSystem,
  findClosestSystemInList
} from './world.ts';

import type { GameState, Coordinates, System } from './types';
import type { FnContext } from '../managers/types';

const createId = () => nanoid(5);

export function generateMap({ S, C, E }: FnContext) {
  S.world = createWorld();

  const dz = HEIGHT / (C.config.numSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  E.emit('LOG', { message: `Generating map...` });

  // Minimum distance between systems
  // Should be < SQRT(PI/NumOfSystems) to ensure spacing
  const minDistance = Math.min(0.08, Math.sqrt(Math.PI / C.config.numSystems));

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation = [longitude, latitude] as Coordinates;
    const thisSystem = createSystem(thisLocation);
    const closestSystem = findClosestSystem(S.world, thisSystem.location);

    if (closestSystem) {
      // Enforce minimum distance
      if (d3.geoDistance(thisLocation, closestSystem.location) < minDistance) {
        z -= dz;
        continue;
      }

      addLane(S.world, thisSystem, closestSystem);
    }

    addSystem(S.world, thisSystem);
  }

  const systems = Array.from(S.world.systemMap.values());

  // Now in reverse
  const s = [systems[systems.length - 1]];
  for (let i = systems.length - 2; i >= 0; i--) {
    const system = systems[i];

    // Add a lane to the closest system that is not itself
    const closestSystem = findClosestSystemInList(system.location, s);
    if (closestSystem) {
      addLane(S.world, system, closestSystem);
    }
    s.push(system);
  }

  buildNeighborMap(S.world);

  E.emit('LOG', {
    message: `Generated ${S.world.systemMap.size} systems and ${S.world.laneMap.size} lanes.`
  });

  const unoccupied = [...systems]; // Copy all systems
  const occupied = [] as System[];

  // Setup inhabited systems (neutral + potential homeworlds)
  // We need enough for all players plus some neutrals
  const totalInhabited = Math.max(
    FP * C.config.numSystems,
    MAX_HUMAN_PLAYERS + MAX_BOTS
  );

  for (let i = 0; i < totalInhabited; i++) {
    if (unoccupied.length === 0) break;
    const randomIndex = Math.floor(Math.random() * unoccupied.length);
    if (randomIndex === 0) {
      i--;
      continue;
    }

    const system = unoccupied[randomIndex];

    // TODO: Enforce minimum distance between inhabited systems

    system.ownerId = null;
    system.type = 'INHABITED';
    system.ships = MAX_SHIPS_PER_SYSTEM + Math.floor(Math.random() * 10);
    system.homeworld = null;

    occupied.push(system);
    unoccupied.splice(randomIndex, 1);
  }
}

export function assignSystem(state: GameState, playerId: string) {
  // TODO: Optimize
  const systems = Array.from(state.world.systemMap.values()).filter(
    (system) => !system.ownerId && system.type === 'INHABITED'
  );

  if (systems.length === 0) {
    throw 'No available homeworlds to join.';
  }

  const index = Math.floor(Math.random() * systems.length);
  const system = systems[index];

  system.ships = 1;
  system.ownerId = system.homeworld = playerId;
  system.type = 'INHABITED';

  return system;
}

function createSystem(location: Coordinates): System {
  return {
    id: 's' + createId(),
    type: 'UNINHABITED',
    location,
    ownerId: null,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null,
    movement: [0, 0]
  };
}
