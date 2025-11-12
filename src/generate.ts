import * as d3 from 'd3';

import { NumInhabited, HEIGHT, NumOfSystems, NumBots, PLAYER } from "./constants";
import { state } from "./state";
import type { Coordinates, Lane, System } from "./types";

let systemIdCounter = 0;

export function generateMap() {
  state.systems = [];
  state.lanes = [];

  const dz = HEIGHT / (NumOfSystems - 1);
  const z0 = -HEIGHT / 2;
  const zN = HEIGHT / 2;

  for (let z = z0; z < zN; z += dz) {
    const latitude = Math.asin(z / (HEIGHT / 2)) * (180 / Math.PI);
    const longitude = Math.random() * 360 - 180;

    const thisLocation: Coordinates = [longitude, latitude];
    const thisSystem:System = {
      id: systemIdCounter++,
      location: thisLocation,
      lanes: [],
      owner: null,
      isInhabited: false,
      isRevealed: false,
      ships: 0,
      homeworld: null
    };

    const closestSystem = findClosestSystem(thisLocation);

    if (closestSystem) {
      // Enforce minimum distance
      if (d3.geoDistance(thisLocation, closestSystem.location) < 0.1) {
        z -= dz;
        continue;
      }

      const id = [thisSystem.id, closestSystem.id].sort((a, b) => a - b).join('-');

      const newLane: Lane = {
        id,
        from: thisSystem,
        to: closestSystem,
        isRevealed: false
      };
      state.lanes.push(newLane);
      thisSystem.lanes = [newLane];
      closestSystem.lanes.push(newLane);
    }

    // TODO: Add secondary connections

    state.systems.push(thisSystem);
  }

  // Setup PLAYER homeworld
  const homeSystem = state.systems[0];
  homeSystem.ships = 1;
  homeSystem.owner = PLAYER;
  state.systems[0].isInhabited = true;
  state.systems[0].homeworld = 1;
  state.selectedSystem = state.systems[0];

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

function findClosestSystem(loc: Coordinates): System | null {
  if (state.systems.length === 0) return null;

  let closestSystem: System | null = null;
  let minDistance = Infinity;

  state.systems.forEach(candidate => {
    if (candidate.location[0] === loc[0] && candidate.location[1] === loc[1]) return;

    const distance = d3.geoDistance(loc, candidate.location);
    if (distance < minDistance) {
      minDistance = distance;
      closestSystem = candidate;
    }
  });

  return closestSystem;
}