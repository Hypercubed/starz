import * as d3 from 'd3';
import { init } from '@paralleldrive/cuid2';

import {
  HEIGHT,
  NumHumanPlayers,
  MAX_SHIPS_PER_SYSTEM,
  FracInhabited
} from '../constants.ts';
import { SystemTypes, type Coordinates, type System } from '../types.ts';
import { debugLog } from '../utils/logging.ts';
import { findClosestSystem, Graph } from '../classes/graph.ts';
import type { GameState } from './types.ts';
import type { FnContext } from '../managers/types.ts';

const createId = init({ length: 5 });

export function generateMap({ G, C }: FnContext) {
  G.world = new Graph();

  const dz = HEIGHT / (C.gameConfig.numSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  debugLog('Generating map...');

  // Minimum distance between systems
  // Should be < SQRT(PI/NumOfSystems) to ensure spacing
  const minDistance = Math.min(
    0.08,
    Math.sqrt(Math.PI / C.gameConfig.numSystems)
  );

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation = [longitude, latitude] as Coordinates;
    const thisSystem = createSystem(thisLocation);
    const closestSystem = G.world.findClosestSystem(thisSystem);

    if (closestSystem) {
      // Enforce minimum distance
      if (d3.geoDistance(thisLocation, closestSystem.location) < minDistance) {
        z -= dz;
        continue;
      }

      G.world.addLane(thisSystem, closestSystem);
    }

    G.world.addSystem(thisSystem);
  }

  // Now in reverse
  const s = [G.world.systems[G.world.systems.length - 1]];
  for (let i = G.world.systems.length - 2; i >= 0; i--) {
    const system = G.world.systems[i];

    // Add a lane to the closest system that is not itself
    const closestSystem = findClosestSystem(system.location, s);
    if (closestSystem) {
      G.world.addLane(system, closestSystem);
    }
    s.push(system);
  }

  G.world.buildNeighborMap();

  debugLog(
    `Generated ${G.world.systems.length} systems and ${G.world.lanes.length} lanes.`
  );

  const unoccupied = G.world.systems.slice(0); // Copy all systems
  const occupied = [] as System[];

  // Setup inhabited systems (neutral + potential homeworlds)
  // We need enough for all players plus some neutrals
  const totalInhabited = Math.max(
    FracInhabited * C.gameConfig.numSystems,
    NumHumanPlayers + C.gameConfig.numBots
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
    system.type = SystemTypes.INHABITED;
    system.ships = MAX_SHIPS_PER_SYSTEM + Math.floor(Math.random() * 10);
    system.homeworld = null;

    occupied.push(system);
    unoccupied.splice(randomIndex, 1);
  }
}

export function assignSystem(state: GameState, playerId: string) {
  const systems = state.world.systems.filter(
    (system) => !system.ownerId && system.type === SystemTypes.INHABITED
  );
  if (systems.length === 0) {
    throw 'No available homeworlds to join.';
  }

  const index = Math.floor(Math.random() * systems.length);
  const system = systems[index];

  system.ships = 1;
  system.ownerId = system.homeworld = playerId;
  system.type = SystemTypes.INHABITED;

  return system;
}

function createSystem(location: Coordinates): System {
  return {
    id: 's' + createId(),
    type: SystemTypes.UNINHABITED,
    location,
    ownerId: null,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null
  };
}
