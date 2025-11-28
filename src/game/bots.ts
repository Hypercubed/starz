// import { Bot as PlayroomBot } from "playroomkit";

import { queueMove } from './actions.ts';
import { NumHumanPlayers } from '../core/constants.ts';
import { state } from './state.ts';
import { type BotInterface, type System } from '../types.ts';

interface BotMove {
  message: string;
  units: number;
  from: System;
  to: System;
  score: number;
}

interface BotPersonality {
  aggression: number; // 0.0 - 1.0: tendency to attack
  expansion: number; // 0.0 - 1.0: priority on claiming unclaimed systems
  defensiveness: number; // 0.0 - 1.0: tendency to defend vs. attack
  riskTolerance: number; // 0.0 - 1.0: willingness to attack with marginal advantage
}

export const PERSONALITIES = {
  territory: {
    aggression: 0.3,
    expansion: 1.0,
    defensiveness: 0.5,
    riskTolerance: 0.4
  }, // 2, Yellow
  rusher: {
    aggression: 1.0,
    expansion: 0.4,
    defensiveness: 0.1,
    riskTolerance: 0.7
  }, // 3, Purple
  turtle: {
    aggression: 0.1,
    expansion: 0.3,
    defensiveness: 0.95,
    riskTolerance: 0.2
  }, // 4, Green
  balanced: {
    aggression: 0.5,
    expansion: 0.5,
    defensiveness: 0.5,
    riskTolerance: 0.5
  } // 5, Orange
} as const satisfies Record<string, BotPersonality>;

export type BotPersonalities = keyof typeof PERSONALITIES;

export function botQueue() {
  state.players.forEach((player) => {
    if (!player.isHuman && player.bot) {
      player.bot.makeMoves();
    }
  });
}

let botId = 2;

export interface BotOptions {
  playerIndex?: number;
  personality?: BotPersonalities;
}

export class Bot implements BotInterface {
  player: number;
  name: string;
  personality: BotPersonality;
  botSystems: System[];
  threatLevels: Map<number, number>;
  frontline: Set<number>;
  backline: Set<number>;

  constructor(botParams: BotOptions = {}) {
    const player = botParams.playerIndex ?? botId++;
    let personality = botParams.personality as BotPersonalities | undefined;

    if (!personality) {
      const keys = Object.keys(PERSONALITIES);
      personality = keys[
        (player - NumHumanPlayers - 1) % keys.length
      ] as BotPersonalities;
    }

    this.player = player;
    this.name = personality;
    this.personality = PERSONALITIES[personality];
    this.botSystems = state.world.systems.filter(
      (system) => system.ownerIndex === player
    );
    this.threatLevels = new Map();
    this.frontline = new Set();
    this.backline = new Set();
  }

  decideAction() {
    console.log(`Bot Player ${this.player} making moves.`);
    this.makeMoves();
    return 'MOVE_FORWARD';
  }

  makeMoves() {
    this.botSystems = state.world.systems.filter(
      (system) => system.ownerIndex === this.player
    );
    this.botSystems.forEach((system) => {
      system.moveQueue = []; // Clear previous moves
    });

    this.analyzeMap();

    const defensiveMoves = this.getDefensiveMoves();
    this.chooseMoves(defensiveMoves, 1.0 - this.personality.defensiveness);

    const coordinatedAttacks = this.getCoordinatedAttackMoves();
    this.chooseMoves(coordinatedAttacks, this.personality.aggression);

    const eXterminate = this.getExterminateMoves();
    this.chooseMoves(eXterminate, this.personality.defensiveness);

    const eXplore = this.getExploreMoves();
    this.chooseMoves(eXplore, this.personality.expansion);

    const logistics = this.getLogisticsMoves();
    this.chooseMoves(logistics, 1.0);
  }

  private analyzeMap() {
    this.threatLevels.clear();
    this.frontline.clear();
    this.backline.clear();

    this.botSystems.forEach((system) => {
      const neighbors = state.world.getAdjacentSystems(system);
      const enemyNeighbors = neighbors.filter(
        (s) => s.ownerIndex && s.ownerIndex !== this.player
      );
      const neutralNeighbors = neighbors.filter((s) => !s.ownerIndex);

      // Threat Level Calculation
      const threatLevel = enemyNeighbors.reduce(
        (sum, enemy) => sum + enemy.ships,
        0
      );
      this.threatLevels.set(system.index, threatLevel);

      // Classification
      if (enemyNeighbors.length > 0 || neutralNeighbors.length > 0) {
        this.frontline.add(system.index);
      } else {
        this.backline.add(system.index);
      }
    });
  }

  private getDefensiveMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return [];

      const moves: BotMove[] = [];
      const fromThreatLevel = this.threatLevels.get(from.index) ?? 0;

      // 1. Emergency Defense (Under Attack)
      if (fromThreatLevel > 0) {
        const defenseNeeded = fromThreatLevel * 1.1; // 10% safety margin

        if (from.ships < defenseNeeded) {
          // We are overwhelmed. Flee if hopeless

          if (from.ships < fromThreatLevel * 0.5) {
            // Find safest neighbor
            const bestRetreat = state.world
              .getAdjacentSystems(from)
              .filter((s) => s.ownerIndex === this.player)
              .sort(
                (a, b) =>
                  (this.threatLevels.get(a.index) || 0) -
                  (this.threatLevels.get(b.index) || 0)
              )[0];

            if (bestRetreat) {
              moves.push({
                message: `Retreating from ${from.index}`,
                from,
                to: bestRetreat,
                units: from.ships - 1,
                score: 1000 // High priority
              });
            }
          } else {
            // Stand ground
            moves.push({
              message: `Holding ${from.id}`,
              from,
              to: from,
              units: 0,
              score: fromThreatLevel
            });
          }
        } else if (from.ships < defenseNeeded * 1.5) {
          // We are safe-ish, but should be careful.
          // If we have overwhelming advantage (ships > 1.5 * defenseNeeded), we don't need to explicitly "Hold".
          // But if we are just "okay", we might want to hold to be safe unless we find a good attack.
          moves.push({
            message: `Defending ${from.id} from threat level ${fromThreatLevel}`,
            from,
            to: from,
            units: 0,
            score: fromThreatLevel
          });
        }
      }

      return moves;
    });
  }

  private getCoordinatedAttackMoves(): BotMove[][] {
    const targets = new Map<number, { target: System; attackers: System[] }>();

    // Identify potential targets
    this.botSystems.forEach((from) => {
      if (from.moveQueue.length > 0) return;
      if (from.ships < 5) return;

      const neighbors = state.world.getAdjacentSystems(from);

      if (!neighbors) return;

      neighbors.forEach((to) => {
        if (to.ownerIndex !== null && to.ownerIndex !== this.player) {
          // Don't attack if it exposes us to a DIFFERENT enemy
          const otherEnemies = state.world
            .getAdjacentSystems(from)
            .filter(
              (s) => s.ownerIndex && s.ownerIndex !== this.player && s.index !== to.index
            );
          if (otherEnemies.length > 0) return;

          if (!targets.has(to.index)) {
            targets.set(to.index, { target: to, attackers: [] });
          }
          targets.get(to.index)!.attackers.push(from);
        }
      });
    });

    const coordinatedMoves: BotMove[][] = [];

    targets.forEach(({ target, attackers }) => {
      // Prioritize weak/isolated targets
      const targetAllies = state.world
        .getAdjacentSystems(target)
        .filter((s) => s.ownerIndex === target.ownerIndex).length;
      const isolationBonus = targetAllies === 0 ? 1.5 : 1.0;

      const totalAttackPower = attackers.reduce((sum, s) => {
        const threat = this.threatLevels.get(s.index) || 0;
        const disposable = Math.max(0, s.ships - threat * 1.1);
        return (
          sum + Math.floor(disposable * (1 - this.personality.defensiveness))
        );
      }, 0);

      const targetDefense = target.ships + (target.homeworld ? 10 : 0);
      const requiredPower =
        targetDefense * (1.3 - this.personality.riskTolerance); // Slightly lower threshold than before

      if (totalAttackPower > requiredPower) {
        attackers.forEach((from) => {
          if (from.moveQueue.length > 0) return;

          const threat = this.threatLevels.get(from.index) || 0;
          const disposable = Math.max(0, from.ships - threat * 1.1);
          const idealUnits = Math.floor(
            disposable * (1 - this.personality.defensiveness)
          );
          const units = this.getBestMoveAmount(from, target, idealUnits);

          if (units > 0) {
            coordinatedMoves.push([
              {
                message: `Coordinated attack on ${target.id}`,
                from,
                to: target,
                units,
                score: (100 + (target.homeworld ? 50 : 0)) * isolationBonus
              }
            ]);
          }
        });
      }
    });

    return coordinatedMoves;
  }

  private getExterminateMoves(): BotMove[][] {
    // Opportunistic attacks on weak neighbors
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return [];
      if (from.ships < 3) return [];

      const neighbors = state.world.getAdjacentSystems(from);
      return neighbors.flatMap((to) => {
        if (to.ownerIndex === this.player || to.ownerIndex === null) return [];

        // Check if we can win easily
        if (from.ships > to.ships * 1.5 + 5) {
          const units = from.ships - 2; // All in
          return [
            {
              message: `Crushing weak neighbor ${to.id}`,
              from,
              to,
              units,
              score: 40
            }
          ];
        }
        return [];
      });
    });
  }

  private getExploreMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return [];
      if (from.ships < 2) return [];

      const neighbors = state.world.getAdjacentSystems(from);
      return neighbors.flatMap((to) => {
        if (to.ownerIndex !== null) return [];

        const units = Math.max(1, Math.floor(from.ships * 0.3));
        return [
          {
            message: `Exploring ${to.id}`,
            from,
            to,
            units,
            score: 30
          }
        ];
      });
    });
  }

  private getLogisticsMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return [];
      if (from.ships < 2) return [];

      // If we are backline, push to frontline
      if (this.backline.has(from.index)) {
        // Find path to nearest frontline? Too expensive.
        // Just push to any neighbor that is closer to frontline or IS frontline.
        // Simple heuristic: Push to neighbor with FEWEST ships? No, that balances.
        // Push to neighbor that is Frontline.
        const frontlineNeighbors = state.world
          .getAdjacentSystems(from)
          .filter((s) => this.frontline.has(s.index) && s.ownerIndex === this.player);

        if (frontlineNeighbors.length > 0) {
          // Push to the one with most need (highest threat or lowest ships?)
          // Let's push to the one with lowest ships to reinforce.
          const target = frontlineNeighbors.sort(
            (a, b) => a.ships - b.ships
          )[0];
          return [
            {
              message: `Logistics: Frontline Support`,
              from,
              to: target,
              units: from.ships - 1, // Send almost everything
              score: 10
            }
          ];
        }

        // If no frontline neighbors, push to any backline neighbor?
        // Random walk towards front?
        // Let's just balance with neighbors for now if deep in backline.
        const neighbors = state.world
          .getAdjacentSystems(from)
          .filter((s) => s.ownerIndex === this.player);
        const target = neighbors.sort((a, b) => a.ships - b.ships)[0];
        if (target && target.ships < from.ships - 2) {
          return [
            {
              message: `Logistics: Balancing`,
              from,
              to: target,
              units: Math.floor((from.ships - target.ships) / 2),
              score: 5
            }
          ];
        }
      }

      // If we are frontline, maybe shift to a threatened neighbor?
      if (this.frontline.has(from.index)) {
        const threatenedNeighbors = state.world
          .getAdjacentSystems(from)
          .filter(
            (s) =>
              s.ownerIndex === this.player &&
              (this.threatLevels.get(s.index) || 0) > s.ships
          );

        if (
          threatenedNeighbors.length > 0 &&
          (this.threatLevels.get(from.index) || 0) < from.ships
        ) {
          // We are safe, neighbor is not. Help!
          const target = threatenedNeighbors[0];
          return [
            {
              message: `Logistics: Emergency Reinforce`,
              from,
              to: target,
              units: Math.floor(from.ships / 2),
              score: 50
            }
          ];
        }
      }

      return [];
    });
  }

  private getBestMoveAmount(
    from: System,
    to: System,
    idealAmount: number
  ): number {
    const massMove = Math.max(0, from.ships - 1);
    let balancedMove = 0;

    if (to.ownerIndex === from.ownerIndex) {
      balancedMove = Math.floor((from.ships - to.ships) / 2);
    } else {
      balancedMove = Math.floor(from.ships / 2);
    }
    balancedMove = Math.max(0, balancedMove);

    if (
      Math.abs(massMove - idealAmount) < Math.abs(balancedMove - idealAmount)
    ) {
      return massMove;
    }
    return balancedMove;
  }

  // @eslint-disable-next-line @typescript-eslint/no-unused-vars
  private chooseMoves(moves: BotMove[][], _weight = 1) {
    if (moves.length === 0) return;

    moves.forEach((systemMoves) => {
      // For each system's possible moves, pick one
      if (systemMoves.length === 0) return;
      const sortedMoves = [...systemMoves].sort(scoreSort);
      const move = sortedMoves[0];

      queueMove(move.from, move.to, move.units, this.player, move.message);
    });
  }
}

function scoreSort(a: BotMove, b: BotMove) {
  // First, compare by the 'score' value
  if (a.score !== b.score) {
    return b.score - a.score; // Sort in descending order of score
  }

  // If scores are equal, randomize their order
  return Math.random() - 0.5;
}
