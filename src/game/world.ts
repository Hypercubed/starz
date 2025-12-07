import { geoDistance } from 'd3';

import type { Coordinates, Lane, System, World } from './types.d.ts';

export function createWorld(): World {
  return {
    systems: [],
    lanes: [],
    systemMap: new Map<string, System>(),
    laneMap: new Map<string, Lane>(),
    neighborMap: new Map<string, Array<string>>()
  };
}

export function addSystem(world: World, node: System): void {
  world.systems.push(node);
  world.systemMap.set(node.id, node);
}

export function addLane(world: World, from: System, to: System): void {
  const id = [from.id, to.id].sort((a, b) => a.localeCompare(b)).join('-');
  if (world.laneMap.has(id)) return;

  const newLane = {
    id,
    fromId: from.id,
    toId: to.id
  } satisfies Lane;

  world.lanes.push(newLane);
  world.laneMap.set(id, newLane);
}

export function buildNeighborMap(world: World) {
  const map = new Map<string, Array<string>>();

  world.lanes.forEach((lane) => {
    if (!map.has(lane.fromId)) {
      map.set(lane.fromId, []);
    }
    map.get(lane.fromId)?.push(lane.toId);

    if (!map.has(lane.toId)) {
      map.set(lane.toId, []);
    }
    map.get(lane.toId)?.push(lane.fromId);
  });
  world.neighborMap = map;
}

export function getAdjacentSystems(world: World, systemId: string): System[] {
  const system = world.systemMap.get(systemId);
  if (!system) return [];

  // Rebuild if missing (though preferably we keep it up to date)
  if (!world.neighborMap || world.neighborMap.size === 0) {
    buildNeighborMap(world);
  }

  const neighbors = world.neighborMap.get(system.id);
  if (!neighbors) return [];
  return neighbors
    .map((id) => world.systemMap.get(id))
    .filter((s): s is System => !!s);
}

export function hasLane(
  world: World,
  systemId1: string,
  systemId2: string
): boolean {
  return world.neighborMap.get(systemId1)?.includes(systemId2) || false;
}

export function findClosestSystem(
  world: World,
  loc: Coordinates
): System | null {
  return findClosestSystemInList(loc, world.systems);
}

export function findClosestSystemInList(
  loc: Coordinates,
  systems: Array<System>
): System | null {
  if (systems.length === 0) return null;

  let closestSystem: System | null = null;
  let minDistance = Infinity;

  systems.forEach((candidate) => {
    if (candidate.location[0] === loc[0] && candidate.location[1] === loc[1])
      return;

    const distance = geoDistance(loc, candidate.location);
    if (distance < minDistance) {
      minDistance = distance;
      closestSystem = candidate;
    }
  });

  return closestSystem;
}

export function worldFromJson(json: any): World {
  const world = createWorld();

  json.systems.forEach((sysJson: any) => {
    const system = {
      ...sysJson,
      moveQueue: [],
      lastMove: null
    } satisfies System;
    addSystem(world, system);
  });

  json.lanes.forEach((laneJson: any) => {
    addLane(
      world,
      world.systemMap.get(laneJson.fromId)!,
      world.systemMap.get(laneJson.toId)!
    );
  });

  buildNeighborMap(world);

  return world;
}
