import { describe, it, expect, beforeEach } from 'vitest';
import { Bot, PERSONALITIES } from '../src/game/bots';
import { createMockSystem } from './setup';

describe('bots', () => {
  describe('Bot class', () => {
    describe('initialization', () => {
      it('should create a bot with default personality', () => {
        const bot = new Bot({ playerIndex: 2 });

        expect(bot.id).toBe('2');
        expect(bot.name).toBeDefined();
        expect(bot.personality).toBeDefined();
      });

      it('should create a bot with specified personality', () => {
        const bot = new Bot({ playerIndex: 2, personality: 'rusher' });

        expect(bot.personality).toEqual(PERSONALITIES.rusher);
        expect(bot.personality.aggression).toBe(1.0);
      });

      it('should work with different personality types', () => {
        const territoryBot = new Bot({
          playerIndex: 2,
          personality: 'territory'
        });
        const rusherBot = new Bot({ playerIndex: 3, personality: 'rusher' });
        const turtleBot = new Bot({ playerIndex: 4, personality: 'turtle' });
        const balancedBot = new Bot({
          playerIndex: 5,
          personality: 'balanced'
        });

        expect(territoryBot.personality.expansion).toBe(1.0);
        expect(rusherBot.personality.aggression).toBe(1.0);
        expect(turtleBot.personality.defensiveness).toBe(0.95);
        expect(balancedBot.personality.aggression).toBe(0.5);
      });
    });

    describe('getBestMoveAmount', () => {
      it('should return ideal amount if system has enough ships', () => {
        const fromSystem = createMockSystem({
          id: `1`,
          ownerId: `2`,
          ships: 20
        });
        const toSystem = createMockSystem({
          id: `2`,
          ownerId: null
        });

        const bot = new Bot({ playerIndex: 2 });
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 10);

        expect(amount).toBe(10);
      });

      it('should leave at least one ship in source system', () => {
        const fromSystem = createMockSystem({
          id: `1`,
          ownerId: `2`,
          ships: 5
        });
        const toSystem = createMockSystem({
          id: `2`,
          ownerId: null
        });

        const bot = new Bot({ playerIndex: 2 });
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 10);

        expect(amount).toBeLessThan(5);
        expect(fromSystem.ships - amount).toBeGreaterThanOrEqual(1);
      });

      it('should not send ships if source has only one ship', () => {
        const fromSystem = createMockSystem({
          id: `1`,
          ownerId: `2`,
          ships: 1
        });
        const toSystem = createMockSystem({
          id: `2`,
          ownerId: null
        });

        const bot = new Bot({ playerIndex: 2 });
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 5);

        expect(amount).toBe(0);
      });

      it('should send enough ships to capture uninhabited systems', () => {
        const fromSystem = createMockSystem({
          id: `1`,
          ownerId: `2`,
          ships: 10
        });
        const toSystem = createMockSystem({
          id: `2`,
          ownerId: null,
          type: 'UNINHABITED',
          ships: 0
        });

        const bot = new Bot({ playerIndex: 2 });
        const amount = bot.getBestMoveAmount(fromSystem, toSystem, 3);

        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThan(fromSystem.ships);
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
