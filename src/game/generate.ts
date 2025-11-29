import * as d3 from 'd3';

import {
  NumInhabited,
  HEIGHT,
  NumOfSystems,
  NumBots,
  NumHumanPlayers,
  MinDistanceBetweenSystems,
  MAX_SHIPS_PER_SYSTEM
} from '../core/constants.ts';
import { state } from './state.ts';
import { SystemTypes, type Coordinates, type System } from '../types.ts';
import { debugLog } from '../utils/logging.ts';
import { findClosestSystem, Graph } from '../classes/graph.ts';

export function generateMap() {
  state.world = new Graph();

  const dz = HEIGHT / (NumOfSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  debugLog('Generating map...');

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation = [longitude, latitude] as Coordinates;
    const thisSystem = createSystem(thisLocation);
    const closestSystem = state.world.findClosestSystem(thisSystem);

    if (closestSystem) {
      // Enforce minimum distance
      if (
        d3.geoDistance(thisLocation, closestSystem.location) <
        MinDistanceBetweenSystems
      ) {
        z -= dz;
        continue;
      }

      state.world.addLane(thisSystem, closestSystem);
    }

    state.world.addSystem(thisSystem);
  }

  // Now in reverse
  const s = [state.world.systems[state.world.systems.length - 1]];
  for (let i = state.world.systems.length - 2; i >= 0; i--) {
    const system = state.world.systems[i];

    // Add a lane to the closest system that is not itself
    const closestSystem = findClosestSystem(system.location, s);
    if (closestSystem) {
      state.world.addLane(system, closestSystem);
    }
    s.push(system);
  }

  state.world.buildNeighborMap();

  debugLog(
    `Generated ${state.world.systems.length} systems and ${state.world.lanes.length} lanes.`
  );

  const unoccupied = state.world.systems.slice(0); // Copy all systems
  const occupied = [] as System[];

  // Setup inhabited systems (neutral + potential homeworlds)
  // We need enough for all players plus some neutrals
  const totalInhabited = Math.max(NumInhabited, NumHumanPlayers + NumBots);

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

export function assignSystem(playerId: string) {
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
  const index = state.world.getNextNodeIndex();
  return {
    id: `${index}`,
    type: SystemTypes.UNINHABITED,
    location,
    ownerId: null,
    isRevealed: false,
    isVisited: false,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null
  };
}
