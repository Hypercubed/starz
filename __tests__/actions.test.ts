import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  orderBalancedMove,
  orderMassMove,
  revealSystem,
  queueMove,
  doQueuedMoves
} from '../game/actions';
import { state, resetState } from '../game/state';
import { createMockSystem, createMockLane } from './setup';

// Mock the render module
vi.mock('../render/render', () => ({
  rerender: vi.fn()
}));

// Mock the logging module
vi.mock('../utils/logging', () => ({
  trackEvent: vi.fn()
}));

// Mock the controls module
vi.mock('../input/controls', () => ({
  removeSystemSelect: vi.fn()
}));

describe('actions', () => {
  beforeEach(() => {
    resetState();
  });

  describe('revealSystem', () => {
    it('should mark system as revealed and visited', () => {
      const system = createMockSystem({
        isRevealed: false,
        isVisited: false
      });

      revealSystem(system);

      expect(system.isRevealed).toBe(true);
      expect(system.isVisited).toBe(true);
    });
  });

  describe.skip('queueMove', () => {
    it("should add a move to the system's move queue", () => {
      const fromSystem = createMockSystem({ id: 1, owner: 1, ships: 10 });
      const toSystem = createMockSystem({ id: 2, owner: 2, ships: 5 });

      queueMove(fromSystem, toSystem, 5);

      expect(fromSystem.moveQueue).toHaveLength(1);
      expect(fromSystem.moveQueue[0]).toEqual({
        ships: 5,
        to: toSystem,
        message: undefined
      });
    });

    it('should support optional message parameter', () => {
      const fromSystem = createMockSystem({ id: 1, owner: 1, ships: 10 });
      const toSystem = createMockSystem({ id: 2, owner: 2, ships: 5 });

      queueMove(fromSystem, toSystem, 5, 'Attack!');

      expect(fromSystem.moveQueue[0].message).toBe('Attack!');
    });

    it('should allow multiple queued moves', () => {
      const fromSystem = createMockSystem({ id: 1, owner: 1, ships: 20 });
      const toSystem1 = createMockSystem({ id: 2 });
      const toSystem2 = createMockSystem({ id: 3 });

      queueMove(fromSystem, toSystem1, 5);
      queueMove(fromSystem, toSystem2, 3);

      expect(fromSystem.moveQueue).toHaveLength(2);
    });
  });

  describe.skip('doQueuedMoves', () => {
    it('should process the first queued move for each system', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 5
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      queueMove(system1, system2, 3);
      state.world.systems = [system1, system2];

      doQueuedMoves();

      expect(system1.ships).toBe(7); // 10 - 3
      expect(system2.ships).toBe(8); // 5 + 3
    });

    it('should set lastMove on the system', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 5
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      queueMove(system1, system2, 3, 'Moving ships');
      state.world.systems = [system1, system2];

      doQueuedMoves();

      expect(system1.lastMove).toBeDefined();
      expect(system1.lastMove?.ships).toBe(3);
      expect(system1.lastMove?.toIndex).toBe(1);
    });

    it('should only process one move per system per call', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 20
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 5
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      queueMove(system1, system2, 3);
      queueMove(system1, system2, 5);
      state.world.systems = [system1, system2];

      doQueuedMoves();

      expect(system1.moveQueue).toHaveLength(1); // One move still queued
      expect(system1.ships).toBe(17); // 20 - 3, only first move processed
    });
  });

  describe.skip('orderBalancedMove', () => {
    it('should balance ships between friendly systems', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 4
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      orderBalancedMove(system1, system2);

      // Delta is (10 - 4) / 2 = 3
      expect(system1.ships).toBe(7); // 10 - 3
      expect(system2.ships).toBe(7); // 4 + 3
    });

    it('should send half ships when attacking enemy system', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 2,
        ships: 3
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      orderBalancedMove(system1, system2);

      // Delta is floor(10 / 2) = 5
      // Attack: 5 > 3, so system2 gets 2 ships (5 - 3) and changes owner
      expect(system1.ships).toBe(5); // 10 - 5
      expect(system2.ships).toBe(2); // 5 - 3
      expect(system2.owner).toBe(1);
    });

    it('should do nothing if no lane exists', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 4
      });

      state.world.lanes = []; // No lanes

      orderBalancedMove(system1, system2);

      expect(system1.ships).toBe(10); // Unchanged
      expect(system2.ships).toBe(4); // Unchanged
    });
  });

  describe.skip('orderMassMove', () => {
    it('should move all but one ship', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 5
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      orderMassMove(system1, system2);

      expect(system1.ships).toBe(1); // Leave 1 ship
      expect(system2.ships).toBe(14); // 5 + 9
    });

    it('should attack with all available ships minus one', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 2,
        ships: 5
      });

      const lane = createMockLane(system1, system2);
      state.world.lanes = [lane];

      orderMassMove(system1, system2);

      // Sends 9 ships (10 - 1)
      // Attack: 9 > 5, so system2 gets 4 ships (9 - 5) and changes owner
      expect(system1.ships).toBe(1);
      expect(system2.ships).toBe(4); // 9 - 5
      expect(system2.owner).toBe(1);
    });

    it('should do nothing if no lane exists', () => {
      const system1 = createMockSystem({
        id: 1,
        owner: 1,
        ships: 10
      });
      const system2 = createMockSystem({
        id: 2,
        owner: 1,
        ships: 5
      });

      state.world.lanes = [];

      orderMassMove(system1, system2);

      expect(system1.ships).toBe(10);
      expect(system2.ships).toBe(5);
    });
  });
});
