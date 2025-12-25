import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createMockManager } from './setup';

import type { GameManager } from '../client/managers/manager';

// Mock the logging module
vi.mock('../src/utils/logging', () => ({
  trackEvent: vi.fn(),
  debugLog: vi.fn()
}));

describe('actions', () => {
  let manager: GameManager;
  let game: typeof import('../client/game/index');

  beforeEach(() => {
    manager = createMockManager();
    game = manager['game'];
  });

  describe('visitSystem', () => {
    it('should mark system as revealed and visited', () => {
      const { S, P } = manager.getFnContext();
      const system = S.world.systemMap.values().next().value;

      game.visitSystem(S, system!);

      expect(P.visitedSystems.has(system!.id)).toBe(true);
      expect(P.revealedSystems.has(system!.id)).toBe(true);
    });
  });

  describe('queueMove', () => {
    it("should add a move to the system's move queue", () => {
      const { S, P } = manager.getFnContext();

      const systems = S.world.systemMap.values();
      const fromSystem = systems.next().value!;
      const toSystem = systems.next().value!;

      game.queueMove(fromSystem, toSystem, 5, P.id);

      expect(fromSystem.moveQueue).toHaveLength(1);
      expect(fromSystem.moveQueue[0]).toEqual({
        playerId: '1',
        ships: 5,
        toId: toSystem.id,
        fromId: fromSystem.id
      });
    });
    ``;

    it('should support optional message parameter', () => {
      const { S, P } = manager.getFnContext();

      const systems = S.world.systemMap.values();
      const fromSystem = systems.next().value!;
      const toSystem = systems.next().value!;

      game.queueMove(fromSystem, toSystem, 5, P.id, 'Attack!');

      expect(fromSystem.moveQueue[0].message).toBe('Attack!');
    });

    it('should allow multiple queued moves', () => {
      const { S, P } = manager.getFnContext();

      const systems = S.world.systemMap.values();
      const fromSystem = systems.next().value!;
      const toSystem1 = systems.next().value!;
      const toSystem2 = systems.next().value!;

      game.queueMove(fromSystem, toSystem1, 5, P.id);
      game.queueMove(fromSystem, toSystem2, 3, P.id);

      expect(fromSystem.moveQueue).toHaveLength(2);
    });
  });

  describe('doQueuedMoves', () => {
    it('should process the first queued move for each system', () => {
      const { S, P } = manager.getFnContext();

      const from = S.world.systemMap.get('1')!;
      const to = S.world.systemMap.get('2')!;

      // Ensure systems have ships
      from.ships = 10;
      to.ships = 5;

      game.queueMove(from, to, 3, P.id);
      game.doQueuedMoves(manager.getFnContext());

      expect(from.ships).toBe(7); // 10 - 3
      expect(to.ships).toBe(8); // 5 + 3
    });

    it('should set lastMove on the system', () => {
      const { S, P } = manager.getFnContext();

      const from = S.world.systemMap.get('1')!;
      const to = S.world.systemMap.get('2')!;

      game.queueMove(from, to, 3, P.id, 'Moving ships');
      game.doQueuedMoves(manager.getFnContext());

      expect(from.lastMove).toBeDefined();
      expect(from.lastMove?.ships).toBe(3);
      expect(from.lastMove?.toId).toBe(`2`);
    });

    it('should process all moves per system per call', () => {
      const { S, P } = manager.getFnContext();

      const from = S.world.systemMap.get('1')!;
      const to = S.world.systemMap.get('2')!;

      // Ensure systems have ships
      from.ships = 20;
      to.ships = 0;

      game.queueMove(from, to, 3, P.id);
      game.queueMove(from, to, 5, P.id);

      game.doQueuedMoves(manager.getFnContext());

      expect(from.moveQueue).toHaveLength(0); // All moves processed
      expect(from.ships).toBe(12); // 20 - 3 - 5, all moves processed
      expect(to.ships).toBe(8); // 0 + 3 + 5
    });
  });
});
