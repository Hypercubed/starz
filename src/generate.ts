import * as d3 from 'd3';

import { NumInhabited, HEIGHT, NumOfSystems, NumBots, PLAYER, MinDistanceBetweenSystems } from "./constants";
import { state } from "./state";
import type { Coordinates, Lane, System } from "./types";

let systemIdCounter = 0;

export function generateMap() {
  state.systems = [];
  state.lanes = [];

  const dz = HEIGHT / (NumOfSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  console.log('Generating map...');
  console.log({ dz });

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation: Coordinates = [longitude, latitude];
    const thisSystem: System = createSystem(thisLocation);
    const closestSystem = findClosestSystem(thisLocation);

    if (closestSystem) {
      // Enforce minimum distance
      if (d3.geoDistance(thisLocation, closestSystem.location) < MinDistanceBetweenSystems) {
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

  console.log(`Generated ${state.systems.length} systems and ${state.lanes.length} lanes.`);
  console.log({ NumOfSystems, NumInhabited, NumBots });

  // Setup PLAYER homeworld
  const homeSystem = state.systems[0];
  homeSystem.ships = 1;
  homeSystem.owner = PLAYER;
  state.systems[0].isInhabited = true;
  state.systems[0].homeworld = 1;
  state.lastSelectedSystem = state.systems[0];
  state.selectedSystems = [state.systems[0]];

  const unoccupied = state.systems.slice(1);
  const occupied = [] as System[];

  // Setup other inhabited systems
  for (let i = 0; i < NumInhabited - 1; i++) {
    const randomIndex = Math.floor(Math.random() * unoccupied.length);
    const system = unoccupied[randomIndex];

    // TODO: Enforce minimum distance between inhabited systems

    system.owner = 0;
    system.isInhabited = true;
    system.ships = 40 + Math.floor(Math.random() * 10);
    system.homeworld = 0;

    occupied.push(system);
    unoccupied.splice(randomIndex, 1);
  }

  // Setup bot homeworlds
  for (let i = 2; i <= NumBots + 1; i++) {
    const idx = Math.floor(Math.random() * occupied.length);
    const system = occupied[idx];

    // TODO: Enforce minimum distance between "players"

    system.ships = 1;
    system.owner = i;
    system.homeworld = i;

    occupied.splice(idx, 1);
  }
}

function createSystem(location: Coordinates): System {
  return {
    id: systemIdCounter++,
    location,
    lanes: [],
    owner: null,
    isInhabited: false,
    isRevealed: false,
    ships: 0,
    homeworld: null
  }
}

function addLane(from: System, to: System): Lane {
  const id = [from.id, to.id].sort((a, b) => a - b).join('-');

  const existingLane = state.lanes.find(lane => lane.id === id);
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

function findClosestSystem(loc: Coordinates, systems = state.systems): System | null {
  if (systems.length === 0) return null;

  let closestSystem: System | null = null;
  let minDistance = Infinity;

  systems.forEach(candidate => {
    if (candidate.location[0] === loc[0] && candidate.location[1] === loc[1]) return;

    const distance = d3.geoDistance(loc, candidate.location);
    if (distance < minDistance) {
      minDistance = distance;
      closestSystem = candidate;
    }
  });

  return closestSystem;
}