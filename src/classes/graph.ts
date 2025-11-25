import { geoDistance } from 'd3';
import type { Coordinates, Lane, System } from '../types';

export class Graph {
  systems: Array<System> = [];
  lanes: Array<Lane> = [];
  neighborMap = new Map<number, Array<number>>();

  addSystem(node: System): number {
    this.systems.push(node);
    return this.systems.length - 1;
  }

  addLane(from: System, to: System): number {
    const id = [from.id, to.id].sort((a, b) => a - b).join('-');
    const existingLaneIndex = this.lanes.findIndex((lane) => lane.id === id);
    if (existingLaneIndex !== -1) return existingLaneIndex;

    const newLane: Lane = {
      id,
      fromIndex: from.id,
      toIndex: to.id
    };

    this.lanes.push(newLane);
    return this.lanes.length - 1;
  }

  getNextNodeIndex(): number {
    return this.systems.length;
  }

  buildNeighborMap() {
    const map = new Map<number, Array<number>>();
    this.lanes.forEach((lane) => {
      if (!map.has(lane.fromIndex)) {
        map.set(lane.fromIndex, []);
      }
      map.get(lane.fromIndex)?.push(lane.toIndex);

      if (!map.has(lane.toIndex)) {
        map.set(lane.toIndex, []);
      }
      map.get(lane.toIndex)?.push(lane.fromIndex);
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
    return neighbors.map((index) => this.systems[index]);
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
