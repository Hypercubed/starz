import { geoDistance } from 'd3';
import { init } from '@paralleldrive/cuid2';

import type { Coordinates, Lane, System } from '../types';

const createId = init({ length: 5 });

export class Graph {
  systems: Array<System> = [];
  lanes: Array<Lane> = [];

  nodeMap = new Map<string, System>();
  laneMap = new Map<string, Lane>();

  neighborMap = new Map<string, Array<string>>();

  addSystem(node: System): void {
    this.systems.push(node);
    this.nodeMap.set(node.id, node);
  }

  addLane(from: System, to: System): void {
    const id = [from.id, to.id].sort((a, b) => a.localeCompare(b)).join('-');
    const existingLaneIndex = this.lanes.findIndex((lane) => lane.id === id);
    if (existingLaneIndex !== -1) return;

    const newLane = {
      id,
      fromId: from.id,
      toId: to.id
    } satisfies Lane;

    this.lanes.push(newLane);
    this.laneMap.set(id, newLane);
  }

  getNextNodeIndex(): number {
    return this.systems.length;
  }

  buildNeighborMap() {
    const map = new Map<string, Array<string>>();
    this.lanes.forEach((lane) => {
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

  getAdjacentSystems(system: System): System[] {
    if (!this.neighborMap) {
      this.buildNeighborMap();
    }

    const neighbors = this.neighborMap.get(system.id);
    if (!neighbors) return [];
    return neighbors.map((id) => this.nodeMap.get(id)!);
  }

  // Check if there's a lane between two systems
  hasLane(system1: System, system2: System): boolean {
    return this.neighborMap.get(system1.id)?.includes(system2.id) || false;
  }

  // Serialization
  toJSON() {
    return {
      systems: this.systems,
      lanes: this.lanes
    };
  }

  static fromJSON(json: any) {
    const graph = new Graph();
    graph.systems = json.systems;
    graph.lanes = json.lanes;
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
