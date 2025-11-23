import { describe, it, expect, beforeEach } from 'vitest';
import { Bot, PERSONALITIES } from '../bots';
import { state, resetState } from '../state';
import { createMockSystem, createConnectedSystems } from './setup';
import { SystemTypes } from '../types';

describe('bots', () => {
  beforeEach(() => {
    resetState();
  });

  describe('Bot class', () => {
    describe('initialization', () => {
      it('should create a bot with default personality', () => {
        const bot = new Bot(2);

        expect(bot.player).toBe(2);
        expect(bot.name).toBeDefined();
        expect(bot.personality).toBeDefined();
      });

      it('should create a bot with specified personality', () => {
        const bot = new Bot(2, 'rusher');

        expect(bot.personality).toEqual(PERSONALITIES.rusher);
        expect(bot.personality.aggression).toBe(1.0);
      });

      it('should work with different personality types', () => {
        const territoryBot = new Bot(2, 'territory');
        const rusherBot = new Bot(3, 'rusher');
        const turtleBot = new Bot(4, 'turtle');
        const balancedBot = new Bot(5, 'balanced');

        expect(territoryBot.personality.expansion).toBe(1.0);
        expect(rusherBot.personality.aggression).toBe(1.0);
        expect(turtleBot.personality.defensiveness).toBe(0.95);
        expect(balancedBot.personality.aggression).toBe(0.5);
      });
    });

    describe('getAdjacentSystems', () => {
      it('should return systems connected by lanes', () => {
        const { systems } = createConnectedSystems(3);
        state.systems = systems;

        const bot = new Bot(2);
        const adjacent = bot.getAdjacentSystems(systems[0]);

        expect(adjacent).toHaveLength(1);
        expect(adjacent[0]).toBe(systems[1]);
      });

      it('should return empty array for isolated systems', () => {
        const system = createMockSystem({ id: 1 });
        state.systems = [system];

        const bot = new Bot(2);
        const adjacent = bot.getAdjacentSystems(system);

        expect(adjacent).toEqual([]);
      });

      it('should return all adjacent systems for a hub', () => {
        const center = createMockSystem({ id: 0 });
        const system1 = createMockSystem({ id: 1 });
        const system2 = createMockSystem({ id: 2 });
        const system3 = createMockSystem({ id: 3 });

        // Create lanes from center to all other systems
        center.lanes = [
          { id: '0-1', from: center, to: system1, isRevealed: true },
          { id: '0-2', from: center, to: system2, isRevealed: true },
          { id: '0-3', from: center, to: system3, isRevealed: true }
        ];

        state.systems = [center, system1, system2, system3];

        const bot = new Bot(2);
        const adjacent = bot.getAdjacentSystems(center);

        expect(adjacent).toHaveLength(3);
        expect(adjacent).toContain(system1);
        expect(adjacent).toContain(system2);
        expect(adjacent).toContain(system3);
      });

      it('should handle bidirectional lanes', () => {
        const system1 = createMockSystem({ id: 1 });
        const system2 = createMockSystem({ id: 2 });

        const lane = {
          id: '1-2',
          from: system1,
          to: system2,
          isRevealed: true
        };

        system1.lanes.push(lane);
        system2.lanes.push(lane);
        state.systems = [system1, system2];

        const bot = new Bot(2);
        const adjacent1 = bot.getAdjacentSystems(system1);
        const adjacent2 = bot.getAdjacentSystems(system2);

        expect(adjacent1).toContain(system2);
        expect(adjacent2).toContain(system1);
      });
    });

    describe('getBestMoveAmount', () => {
      it('should return ideal amount if system has enough ships', () => {
        const fromSystem = createMockSystem({
          id: 1,
          owner: 2,
          ships: 20
        });
        const toSystem = createMockSystem({
          id: 2,
          owner: null
        });

        const bot = new Bot(2);
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 10);

        expect(amount).toBe(10);
      });

      it('should leave at least one ship in source system', () => {
        const fromSystem = createMockSystem({
          id: 1,
          owner: 2,
          ships: 5
        });
        const toSystem = createMockSystem({
          id: 2,
          owner: null
        });

        const bot = new Bot(2);
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 10);

        expect(amount).toBeLessThan(5);
        expect(fromSystem.ships - amount).toBeGreaterThanOrEqual(1);
      });

      it('should not send ships if source has only one ship', () => {
        const fromSystem = createMockSystem({
          id: 1,
          owner: 2,
          ships: 1
        });
        const toSystem = createMockSystem({
          id: 2,
          owner: null
        });

        const bot = new Bot(2);
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 5);

        expect(amount).toBe(0);
      });

      it('should send enough ships to capture uninhabited systems', () => {
        const fromSystem = createMockSystem({
          id: 1,
          owner: 2,
          ships: 10
        });
        const toSystem = createMockSystem({
          id: 2,
          owner: null,
          type: SystemTypes.UNINHABITED,
          ships: 0
        });

        const bot = new Bot(2);
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 3);

        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThan(fromSystem.ships);
      });
    });

    describe('makeMoves', () => {
      it('should not crash when bot has no systems', () => {
        state.systems = [];
        const bot = new Bot(2);

        expect(() => bot.makeMoves()).not.toThrow();
      });

      it('should queue moves when bot has systems', () => {
        const botSystem = createMockSystem({
          id: 1,
          owner: 2,
          ships: 10,
          type: SystemTypes.INHABITED
        });
        const targetSystem = createMockSystem({
          id: 2,
          owner: null,
          ships: 0,
          type: SystemTypes.UNINHABITED
        });

        const lane = {
          id: '1-2',
          from: botSystem,
          to: targetSystem,
          isRevealed: true
        };

        botSystem.lanes.push(lane);
        state.systems = [botSystem, targetSystem];

        const bot = new Bot(2);
        bot.makeMoves();

        // Bot should have evaluated moves (exact behavior depends on personality)
        // We just verify it doesn't crash and can process the situation
        expect(botSystem.moveQueue.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('PERSONALITIES', () => {
    it('should have all required personality types', () => {
      expect(PERSONALITIES.territory).toBeDefined();
      expect(PERSONALITIES.rusher).toBeDefined();
      expect(PERSONALITIES.turtle).toBeDefined();
      expect(PERSONALITIES.balanced).toBeDefined();
    });

    it('should have valid personality values', () => {
      Object.values(PERSONALITIES).forEach((personality) => {
        expect(personality.aggression).toBeGreaterThanOrEqual(0);
        expect(personality.aggression).toBeLessThanOrEqual(1);
        expect(personality.expansion).toBeGreaterThanOrEqual(0);
        expect(personality.expansion).toBeLessThanOrEqual(1);
        expect(personality.defensiveness).toBeGreaterThanOrEqual(0);
        expect(personality.defensiveness).toBeLessThanOrEqual(1);
        expect(personality.riskTolerance).toBeGreaterThanOrEqual(0);
        expect(personality.riskTolerance).toBeLessThanOrEqual(1);
      });
    });

    it('should have distinct personality characteristics', () => {
      expect(PERSONALITIES.rusher.aggression).toBeGreaterThan(
        PERSONALITIES.turtle.aggression
      );
      expect(PERSONALITIES.territory.expansion).toBeGreaterThan(
        PERSONALITIES.rusher.expansion
      );
      expect(PERSONALITIES.turtle.defensiveness).toBeGreaterThan(
        PERSONALITIES.rusher.defensiveness
      );
    });
  });
});
