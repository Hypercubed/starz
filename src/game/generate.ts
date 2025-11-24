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
import {
  SystemTypes,
  type Coordinates,
  type Lane,
  type System
} from '../types.ts';
import { debugLog } from '../utils/logging.ts';

let systemIdCounter = 0;

export function generateMap() {
  state.systems = [];
  state.lanes = [];

  const dz = HEIGHT / (NumOfSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  debugLog('Generating map...');

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation: Coordinates = [longitude, latitude];
    const thisSystem: System = createSystem(thisLocation);
    const closestSystem = findClosestSystem(thisLocation);

    if (closestSystem) {
      // Enforce minimum distance
      if (
        d3.geoDistance(thisLocation, closestSystem.location) <
        MinDistanceBetweenSystems
      ) {
        z -= dz;
        continue;
      }

      addLane(thisSystem, closestSystem);
    }

    // TODO: Add secondary connections

    state.systems.push(thisSystem);
  }

  // Now in reverse
  const s = [state.systems[state.systems.length - 1]];
  for (let i = state.systems.length - 2; i >= 0; i--) {
    const system = state.systems[i];

    // Add a lane to the closest system that is not itself
    const closestSystem = findClosestSystem(system.location, s);
    if (closestSystem) {
      addLane(system, closestSystem);
    }
    s.push(system);
  }

  debugLog(
    `Generated ${state.systems.length} systems and ${state.lanes.length} lanes.`
  );

  const unoccupied = state.systems.slice(0); // Copy all systems
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

    system.owner = 0;
    system.type = SystemTypes.INHABITED;
    system.ships = MAX_SHIPS_PER_SYSTEM + Math.floor(Math.random() * 10);
    system.homeworld = 0;

    occupied.push(system);
    unoccupied.splice(randomIndex, 1);
  }

  // Setup homeworlds for all players (Human + Bots)
  const totalPlayers = NumHumanPlayers + NumBots;

  for (let i = 1; i <= totalPlayers; i++) {
    // Ensure we have enough occupied systems, otherwise take from unoccupied
    let system: System;
    if (i <= NumHumanPlayers) {
      system = state.systems[0];
    } else if (occupied.length > 0) {
      const idx = Math.floor(Math.random() * occupied.length);
      system = occupied[idx];
      occupied.splice(idx, 1);
    } else if (unoccupied.length > 0) {
      const idx = Math.floor(Math.random() * unoccupied.length);
      system = unoccupied[idx];
      unoccupied.splice(idx, 1);
      // Initialize it as inhabited since we pulled from unoccupied
      system.type = SystemTypes.INHABITED;
      system.ships = MAX_SHIPS_PER_SYSTEM + Math.floor(Math.random() * 10);
    } else {
      console.error('Not enough systems for players!');
      break;
    }

    system.ships = 1;
    system.owner = i;
    system.homeworld = i;
    system.type = SystemTypes.INHABITED;

    // If this is a human player, set initial selection
    if (i <= NumHumanPlayers) {
      state.lastSelectedSystem = system;
      state.selectedSystems = [system];
    }
  }
}

function createSystem(location: Coordinates): System {
  return {
    id: systemIdCounter++,
    type: 'uninhabited',
    location,
    lanes: [],
    owner: null,
    isRevealed: false,
    isVisited: false,
    ships: 0,
    homeworld: null,
    moveQueue: [],
    lastMove: null
  };
}

function addLane(from: System, to: System): Lane {
  const id = [from.id, to.id].sort((a, b) => a - b).join('-');

  const existingLane = state.lanes.find((lane) => lane.id === id);
  if (existingLane) {
    return existingLane;
  }

  const newLane: Lane = {
    id,
    from,
    to,
    isRevealed: false
  };
  state.lanes.push(newLane);
  from.lanes.push(newLane);
  to.lanes.push(newLane);
  return newLane;
}

export function findClosestSystem(
  loc: Coordinates,
  systems = state.systems
): System | null {
  if (systems.length === 0) return null;

  let closestSystem: System | null = null;
  let minDistance = Infinity;

  systems.forEach((candidate) => {
    if (candidate.location[0] === loc[0] && candidate.location[1] === loc[1])
      return;

    const distance = d3.geoDistance(loc, candidate.location);
    if (distance < minDistance) {
      minDistance = distance;
      closestSystem = candidate;
    }
  });

  return closestSystem;
}
