import { init } from '@paralleldrive/cuid2';
import { geoDistance } from 'd3';

import type { Coordinates, Lane, System } from '../types';

const createId = init({ length: 5 });

export type GraphJSON = {
  systems: Array<System>;
  lanes: Array<Lane>;
};

export class Graph {
  systems: Array<System> = [];
  lanes: Array<Lane> = [];

  systemMap = new Map<string, System>();
  laneMap = new Map<string, Lane>();

  neighborMap = new Map<string, Array<string>>();

  addSystem(node: System): void {
    this.systems.push(node);
    this.systemMap.set(node.id, node);
  }

  addLane(from: System, to: System): void {
    const id = [from.id, to.id].sort((a, b) => a.localeCompare(b)).join('-');
    if (this.laneMap.has(id)) return;

    const newLane = {
      id,
      fromId: from.id,
      toId: to.id
    } satisfies Lane;

    this.lanes.push(newLane);
    this.laneMap.set(id, newLane);
  }

  buildNeighborMap() {
    const map = new Map<string, Array<string>>();
    this.laneMap.forEach((lane) => {
      if (!map.has(lane.fromId)) {
        map.set(lane.fromId, []);
      }
      map.get(lane.fromId)?.push(lane.toId);

      if (!map.has(lane.toId)) {
        map.set(lane.toId, []);
      }
      map.get(lane.toId)?.push(lane.fromId);
    });
    this.neighborMap = map;
  }

  findClosestSystem(system: System): System | null {
    return findClosestSystem(system.location, this.systems);
  }

  getAdjacentSystems(systemId: string): System[] {
    const system = this.systemMap.get(systemId);
    if (!system) return [];

    if (!this.neighborMap) {
      this.buildNeighborMap();
    }

    const neighbors = this.neighborMap.get(system.id);
    if (!neighbors) return [];
    return neighbors.map((id) => this.systemMap.get(id)!);
  }

  // Check if there's a lane between two systems
  hasLane(systemId1: string, systemId2: string): boolean {
    return this.neighborMap.get(systemId1)?.includes(systemId2) || false;
  }

  // Serialization
  toJSON(): GraphJSON {
    return {
      systems: this.systems,
      lanes: this.lanes
    };
  }

  static fromJSON(json: GraphJSON) {
    const graph = new Graph();
    graph.systemMap = new Map<string, System>();
    graph.laneMap = new Map<string, Lane>();

    json.systems.forEach((system) => {
      graph.systemMap.set(system.id, system);
    });

    json.lanes.forEach((lane) => {
      graph.laneMap.set(lane.id, lane);
    });

    graph.buildNeighborMap();
    return graph;
  }

  static cuid() {
    return createId();
  }
}

export function findClosestSystem(
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
