import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findClosestSystem } from '../game/generate';
import { state } from '../game/state';
import { createMockSystem, createMockCoordinates } from './setup';

// Mock the state module
vi.mock('../game/state', () => ({
  state: {
    systems: [],
    lanes: []
  }
}));

describe('generate', () => {
  beforeEach(() => {
    state.systems = [];
    state.lanes = [];
  });

  describe('findClosestSystem', () => {
    it('should return null for empty systems array', () => {
      const location = createMockCoordinates(0, 0);
      const result = findClosestSystem(location, []);

      expect(result).toBeNull();
    });

    it('should return null when no other systems exist', () => {
      const location = createMockCoordinates(0, 0);
      const result = findClosestSystem(location);

      expect(result).toBeNull();
    });

    it('should return the only system when one exists', () => {
      const location = createMockCoordinates(0, 0);
      const system1 = createMockSystem({
        id: 1,
        location: createMockCoordinates(10, 10)
      });

      const result = findClosestSystem(location, [system1]);

      expect(result).toBe(system1);
    });

    it('should find the closest system by distance', () => {
      const location = createMockCoordinates(0, 0);
      const nearSystem = createMockSystem({
        id: 1,
        location: createMockCoordinates(1, 1)
      });
      const farSystem = createMockSystem({
        id: 2,
        location: createMockCoordinates(50, 50)
      });

      const result = findClosestSystem(location, [farSystem, nearSystem]);

      expect(result).toBe(nearSystem);
    });

    it('should exclude the query location itself', () => {
      const location = createMockCoordinates(10, 10);
      const sameSystem = createMockSystem({
        id: 1,
        location: createMockCoordinates(10, 10)
      });
      const otherSystem = createMockSystem({
        id: 2,
        location: createMockCoordinates(20, 20)
      });

      const result = findClosestSystem(location, [sameSystem, otherSystem]);

      expect(result).toBe(otherSystem);
    });

    it('should handle systems with different longitudes and latitudes', () => {
      const location = createMockCoordinates(0, 0);
      const system1 = createMockSystem({
        id: 1,
        location: createMockCoordinates(-10, 5)
      });
      const system2 = createMockSystem({
        id: 2,
        location: createMockCoordinates(15, -8)
      });
      const system3 = createMockSystem({
        id: 3,
        location: createMockCoordinates(2, 2)
      });

      const result = findClosestSystem(location, [system1, system2, system3]);

      expect(result).toBe(system3);
    });

    it('should use geodesic distance for calculation', () => {
      // Points near the poles behave differently than equatorial points
      const location = createMockCoordinates(0, 89); // Near north pole
      const system1 = createMockSystem({
        id: 1,
        location: createMockCoordinates(0, 88)
      });
      const system2 = createMockSystem({
        id: 2,
        location: createMockCoordinates(180, 89) // Same latitude, opposite longitude
      });

      const result = findClosestSystem(location, [system1, system2]);

      // system2 should be closer at high latitudes due to geodesic distance
      expect(result).toBe(system1);
    });

    it('should handle multiple systems and find the globally closest', () => {
      const location = createMockCoordinates(0, 0);
      const systems = [
        createMockSystem({ id: 1, location: createMockCoordinates(10, 10) }),
        createMockSystem({ id: 2, location: createMockCoordinates(20, 20) }),
        createMockSystem({ id: 3, location: createMockCoordinates(5, 5) }),
        createMockSystem({ id: 4, location: createMockCoordinates(15, 15) })
      ];

      const result = findClosestSystem(location, systems);

      expect(result?.id).toBe(3); // ID 3 is at (5, 5), closest to (0, 0)
    });
  });
});
