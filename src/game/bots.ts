import { queueMove } from './actions';
import { NumHumanPlayers } from '../core/constants';
import { state } from './state';
import { SystemTypes, type System } from '../types';

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

export class Bot {
  player: number;
  name: string;
  personality: BotPersonality;
  botSystems: System[];
  threatLevels: Map<number, number>;

  constructor(player: number, personality?: BotPersonalities) {
    if (!personality) {
      const keys = Object.keys(PERSONALITIES);
      personality = keys[
        (player - NumHumanPlayers - 1) % keys.length
      ] as BotPersonalities;
    }
    this.player = player;
    this.name = personality;
    this.personality = PERSONALITIES[personality];
    this.botSystems = state.systems.filter((system) => system.owner === player);
    this.threatLevels = new Map();
  }

  makeMoves() {
    this.botSystems = state.systems.filter(
      (system) => system.owner === this.player
    );
    this.botSystems.forEach((system) => {
      system.moveQueue = []; // Clear previous moves
    });

    this.calculateThreatLevels();

    const defensiveMoves = this.getDefensiveMoves();
    this.chooseMoves(defensiveMoves, 1.0 - this.personality.defensiveness);

    const coordinatedAttacks = this.getCoordinatedAttackMoves();
    this.chooseMoves(coordinatedAttacks, this.personality.aggression);

    const eXterminate = this.getExterminateMoves();
    this.chooseMoves(eXterminate, this.personality.defensiveness);

    const eXplore = this.getExploreMoves();
    this.chooseMoves(eXplore, this.personality.expansion);

    const eXpand = this.getExpandMoves();
    this.chooseMoves(eXpand, 1.0 - this.personality.defensiveness);
  }

  calculateThreatLevels() {
    this.threatLevels = this.botSystems.reduce((acc, system) => {
      const adjacentEnemies = this.getAdjacentSystems(system).filter(
        (s) => s.owner && s.owner !== this.player
      );
      const threatLevel = adjacentEnemies.reduce(
        (sum, enemy) => sum + enemy.ships,
        0
      );
      acc.set(system.id, threatLevel);
      return acc;
    }, new Map<number, number>());
  }

  getDefensiveMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued

      const moves: BotMove[] = [];
      const fromThreatLevel = this.threatLevels.get(from.id) || 0;

      // --- Defend (Stay) Logic ---
      if (fromThreatLevel > 0) {
        let defense = from.ships * this.personality.defensiveness;

        // Increase defensiveness based on inhabited status
        if (from.type === SystemTypes.INHABITED) {
          defense *= 1.5; // Keep more ships on inhabited worlds
        }

        let s = 1;
        if (from.homeworld) s *= 1.5;
        if (!from.homeworld && from.type === SystemTypes.INHABITED) s *= 1.2;

        // Calculate win chance
        const winChance = from.ships / (fromThreatLevel + 1);
        let scoreModifier = 1.0;

        if (from.ships < fromThreatLevel) {
          // Overwhelmed: likely to lose the system
          scoreModifier = 0.5 * winChance; // Reduce score significantly
        } else {
          // Holdable: likely to win
          scoreModifier = 1.5; // Boost score
        }

        const risk =
          fromThreatLevel *
          (1 - this.personality.riskTolerance) *
          s *
          scoreModifier;

        if (risk > defense) {
          const threateningNeighbors = this.getAdjacentSystems(from)
            .filter((s) => s.owner && s.owner !== this.player)
            .map((s) => s.id);

          moves.push({
            message: `Defending system ${from.id} against [${threateningNeighbors.join(', ')}] (Threat: ${fromThreatLevel})`,
            from,
            to: from,
            units: 0,
            score: fromThreatLevel * scoreModifier
          } satisfies BotMove);
        }
      }

      // --- Reinforce Logic ---
      if (from.ships > 1) {
        from.lanes.forEach((lane) => {
          const to = lane.from === from ? lane.to : lane.from;
          if (to.owner !== this.player) return;

          const toThreatLevel = this.threatLevels.get(to.id) || 0;
          if (toThreatLevel === 0) return; // No threat to reenforce against

          const dfrom = fromThreatLevel - from.ships;
          const dto = toThreatLevel - to.ships;

          // Logic for reinforcing or fleeing
          let isFleeing = false;
          if (dfrom > dto) {
            // Source is more threatened than destination.
            // Only allow move if we are overwhelmed at source (Fleeing)
            if (from.ships < fromThreatLevel) {
              isFleeing = true;
            } else {
              return; // Stand and fight if not overwhelmed
            }
          }

          const idealUnits = Math.floor(
            (from.ships - to.ships) * (1 - this.personality.defensiveness)
          );
          let units = this.getBestMoveAmount(from, to, idealUnits);

          // Ping-Pong Fix: If not fleeing, prefer Balanced Move to avoid over-committing
          if (!isFleeing) {
            const balancedMove = Math.floor((from.ships - to.ships) / 2);
            // If mass move is selected but balanced move is safer/better for stability, downgrade
            if (units > balancedMove) {
              units = Math.max(0, balancedMove);
            }
          }

          let s = 1;
          if (to.homeworld) s *= 1.5;
          if (!to.homeworld && to.type === 'inhabited') s *= 1.2;

          const min = from.ships * (1 - this.personality.riskTolerance) * s;

          if (units > min) {
            moves.push({
              message: isFleeing
                ? `Fleeing system ${from.id} to ${to.id}`
                : `Reenforcing system ${to.id} from ${from.id}`,
              from,
              to,
              units,
              score: Math.abs(dto - dfrom)
            } satisfies BotMove);
          }
        });
      }

      return moves;
    });
  }

  getCoordinatedAttackMoves(): BotMove[][] {
    const targets = new Map<number, { target: System; attackers: System[] }>();

    // Identify potential targets and available attackers
    this.botSystems.forEach((from) => {
      if (from.moveQueue.length > 0) return; // Busy
      if (from.ships < 5) return; // Too weak to contribute

      from.lanes.forEach((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== null && to.owner !== this.player) {
          if (!targets.has(to.id)) {
            targets.set(to.id, { target: to, attackers: [] });
          }
          targets.get(to.id)!.attackers.push(from);
        }
      });
    });

    const coordinatedMoves: BotMove[][] = [];

    // Evaluate each target
    targets.forEach(({ target, attackers }) => {
      if (attackers.length < 2) return; // Need at least 2 systems for a "coordinated" attack

      const totalAttackPower = attackers.reduce(
        (sum, s) =>
          sum + Math.floor(s.ships * (1 - this.personality.defensiveness)),
        0
      );

      const targetDefense = target.ships + (target.homeworld ? 10 : 0);
      const requiredPower =
        targetDefense * (1.5 - this.personality.riskTolerance); // Safety margin

      if (totalAttackPower > requiredPower) {
        // Launch attack!
        attackers.forEach((from) => {
          // Double check availability, though we filtered earlier
          if (from.moveQueue.length > 0) return;

          const idealUnits = Math.floor(
            from.ships * (1 - this.personality.defensiveness)
          );
          const units = this.getBestMoveAmount(from, target, idealUnits);

          if (units > 0) {
            coordinatedMoves.push([
              {
                message: `Coordinated attack on ${target.id} from ${from.id}`,
                from,
                to: target,
                units,
                score: 100 + (target.homeworld ? 50 : 0) // High priority
              }
            ]);
          }
        });
      }
    });

    return coordinatedMoves;
  }

  getExterminateMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued

      if (from.ships < 3) return [];

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner === this.player || to.owner === null) return [];

        const idealUnits = Math.floor(
          from.ships * (1 - this.personality.defensiveness)
        );
        const units = this.getBestMoveAmount(from, to, idealUnits);
        const min = (to.ships + 1) * (1 - this.personality.riskTolerance);

        if (units > min) {
          let score = (units - min) * 5;

          // Bonus if taking system would isolate enemy systems
          const adjacentToTarget = to.lanes.map((l) =>
            l.from === to ? l.to : l.from
          );
          const enemyNeighbors = adjacentToTarget.filter(
            (s) => s.owner === to.owner
          ).length;
          if (enemyNeighbors === 0) {
            score += 30; // Isolation bonus
          }

          score += 20; // Base bonus for taking a system

          return [
            {
              message: `Exterminating from system ${from.id} to ${to.id}`,
              from,
              to,
              units,
              score
            } satisfies BotMove
          ];
        }

        return [];
      });
    });
  }

  getExploreMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships < 2) return [];
      if (from.homeworld !== null && from.ships < 5) return []; // Keep more ships on homeworlds

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== null) return [];

        // Keep more ships on homeworlds
        let ratio = 1 - this.personality.defensiveness * 0.5;
        if (from.homeworld) {
          ratio *= 0.5; // Send fewer ships from homeworld
        }
        const idealUnits = Math.floor(from.ships * ratio);
        const unitsToSend = this.getBestMoveAmount(from, to, idealUnits);

        if (unitsToSend > 0) {
          let score = 50;

          // Bonus for connecting to more unclaimed systems
          const adjacentToTarget = to.lanes.map((l) =>
            l.from === to ? l.to : l.from
          );
          const unclaimedNeighbors = adjacentToTarget.filter(
            (s) => s.owner === null
          ).length;
          score += unclaimedNeighbors * 20;

          // Bonus for connecting our territories
          const friendlyNeighbors = adjacentToTarget.filter(
            (s) => s.owner === this.player
          ).length;
          score += friendlyNeighbors * 10;

          return [
            {
              message: `Exploring from system ${from.id} to ${to.id}`,
              from,
              to,
              units: unitsToSend,
              score
            } satisfies BotMove
          ];
        }

        return [];
      });
    });
  }

  getExpandMoves(): BotMove[][] {
    return this.botSystems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships <= 1) return [];

      const fromThreatLevel = this.threatLevels.get(from.id) || 0;
      if (fromThreatLevel > 0) return []; // Prioritize defense over expansion

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== this.player) return [];

        const idealUnits = Math.floor(
          (from.ships - to.ships) * (1 - this.personality.defensiveness)
        );
        const units = this.getBestMoveAmount(from, to, idealUnits);
        const min =
          (1 - this.personality.riskTolerance) * (from.homeworld ? 10 : 1);

        if (units > min && to.ships + 2 < from.ships) {
          const score = 10 + (10 - to.ships); // Prefer weaker friendly systems, keep positive
          return [
            {
              message: `Expanding from system ${from.id} to ${to.id}`,
              from,
              to,
              units,
              score
            } satisfies BotMove
          ];
        }

        return [];
      });
    });
  }

  getBestMoveAmount(from: System, to: System, idealAmount: number): number {
    const massMove = Math.max(0, from.ships - 1);
    let balancedMove = 0;

    if (to.owner === from.owner) {
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
  chooseMoves(moves: BotMove[][], _weight = 1) {
    if (moves.length === 0) return;

    moves.forEach((systemMoves) => {
      // For each system's possible moves, pick one
      if (systemMoves.length === 0) return;
      const sortedMoves = [...systemMoves].sort(scoreSort);
      const move = sortedMoves[0];

      queueMove(move.from, move.to, move.units, move.message);
    });
  }

  getAdjacentSystems(system: System): System[] {
    return system.lanes
      .map((lane) => {
        if (lane.from === system) return lane.to;
        if (lane.to === system) return lane.from;
        return null;
      })
      .filter((s): s is System => s !== null);
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
