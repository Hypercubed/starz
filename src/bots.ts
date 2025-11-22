import { queueMove } from "./actions";
import { NumBots, NumHumanPlayers } from "./constants";
import { debugLog } from "./logging";
import { state } from "./state";
import type { System } from "./types";

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

const PERSONALITIES = {
  turtle: {
    aggression: 0.2,
    expansion: 0.3,
    defensiveness: 0.9,
    riskTolerance: 0.2,
  }, // 2
  rusher: {
    aggression: 0.9,
    expansion: 0.4,
    defensiveness: 0.2,
    riskTolerance: 0.7,
  }, // 3
  territory: {
    aggression: 0.3,
    expansion: 0.9,
    defensiveness: 0.5,
    riskTolerance: 0.4,
  }, // 4
  balanced: {
    aggression: 0.5,
    expansion: 0.5,
    defensiveness: 0.5,
    riskTolerance: 0.5,
  }, // 5
} as const satisfies Record<string, BotPersonality>;

const BOT_PERSONALITIES: Record<number, BotPersonality> = {};
for (let i = 0; i < NumBots; i++) {
  const botId = NumHumanPlayers + 1 + i;
  const personalityKeys = Object.keys(PERSONALITIES);
  const chosenPersonality = personalityKeys[i % personalityKeys.length];
  BOT_PERSONALITIES[botId] =
    PERSONALITIES[chosenPersonality as keyof typeof PERSONALITIES];
}

debugLog("Bot personalities:", BOT_PERSONALITIES);

export function botQueue() {
  const totalPlayers = NumHumanPlayers + NumBots;

  for (let player = NumHumanPlayers + 1; player < totalPlayers + 1; player++) {
    // debugLog(`Bot ${player} is making moves...`);
    basicBot(player);
  }
}

function basicBot(player: number) {
  const personality = BOT_PERSONALITIES[player];

  const botSystems = state.systems.filter((system) => system.owner === player);

  botSystems.forEach((system) => {
    system.moveQueue = []; // Clear previous moves
  });

  const threatLevels = botSystems.reduce((acc, system) => {
    const adjacentEnemies = getAdjacentSystems(system).filter(
      (s) => s.owner && s.owner !== player,
    );
    const threatLevel = adjacentEnemies.reduce(
      (sum, enemy) => sum + enemy.ships,
      0,
    );
    acc.set(system.id, threatLevel);
    return acc;
  }, new Map<number, number>());

  const defendMoves = getDefendMoves(botSystems);
  chooseMoves(defendMoves, 1.0 - personality.defensiveness);

  const reenforceMoves = getReenforceMoves(botSystems, player);
  chooseMoves(reenforceMoves, 1.0 - personality.defensiveness);

  const eXterminate = getExterminateMoves(botSystems, player);
  chooseMoves(eXterminate, personality.defensiveness);

  const eXplore = getExploreMoves(botSystems, player);
  chooseMoves(eXplore, personality.expansion);

  const eXpand = getExpandMoves(botSystems, player);
  chooseMoves(eXpand, 1.0 - personality.defensiveness);

  function getDefendMoves(systems: System[]) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      const fromThreatLevel = threatLevels.get(from.id) || 0;
      if (fromThreatLevel === 0) return []; // No threat detected

      // TODO: Increase defensiveness based on inhabited
      const defense = from.ships * personality.defensiveness;

      let s = 1;
      if (from.homeworld) s *= 1.5;
      if (!from.homeworld && from.type === "inhabited") s *= 1.2;

      const risk = fromThreatLevel * (1 - personality.riskTolerance) * s;

      if (risk > defense) {
        return [
          {
            message: `Defending system ${from.id} with threat level ${fromThreatLevel}`,
            from,
            to: from,
            units: 0,
            score: fromThreatLevel,
          } satisfies BotMove,
        ];
      }

      return [];
    });
  }

  function getReenforceMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships <= 1) return [];

      const fromThreatLevel = threatLevels.get(from.id) || 0;

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== player) return [];

        const toThreatLevel = threatLevels.get(to.id) || 0;
        if (toThreatLevel === 0) return []; // No threat to reenforce against

        const dfrom = fromThreatLevel - to.ships;
        const dto = toThreatLevel - to.ships;

        if (dfrom < dto) return []; // Don't reenforce less threatened systems

        const units = Math.floor(
          (from.ships - to.ships) * (1 - personality.defensiveness),
        );

        let s = 1;
        if (to.homeworld) s *= 1.5;
        if (!to.homeworld && to.type === "inhabited") s *= 1.2;

        const min = from.ships * (1 - personality.riskTolerance) * s;

        if (units > min) {
          return [
            {
              message: `Reenforcing system ${to.id} from ${from.id}`,
              from,
              to,
              units,
              score: dto - dfrom,
            } satisfies BotMove,
          ];
        }

        return [];
      });
    });
  }

  function getExterminateMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued

      if (from.ships < 3) return [];

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner === player || to.owner === null) return [];

        const units = Math.floor(from.ships * (1 - personality.defensiveness));
        const min = (to.ships + 1) * (1 - personality.riskTolerance);

        if (units > min) {
          let score = (units - min) * 5;

          // Bonus if taking system would isolate enemy systems
          const adjacentToTarget = to.lanes.map((l) =>
            l.from === to ? l.to : l.from,
          );
          const enemyNeighbors = adjacentToTarget.filter(
            (s) => s.owner === to.owner,
          ).length;
          if (enemyNeighbors === 0) {
            score += 30; // Isolation bonus
          }

          return [
            {
              message: `Exterminating from system ${from.id} to ${to.id}`,
              from,
              to,
              units,
              score,
            } satisfies BotMove,
          ];
        }

        return [];
      });
    });
  }

  function getExploreMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships < 2) return [];
      if (from.homeworld !== null && from.ships < 5) return []; // Keep more ships on homeworlds

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== null) return [];

        // TODO: Keep more ships on homeworlds
        const unitsToSend = Math.floor(
          from.ships * (1 - personality.defensiveness * 0.5),
        );

        if (unitsToSend > 0) {
          let score = 50;

          // Bonus for connecting to more unclaimed systems
          const adjacentToTarget = to.lanes.map((l) =>
            l.from === to ? l.to : l.from,
          );
          const unclaimedNeighbors = adjacentToTarget.filter(
            (s) => s.owner === null,
          ).length;
          score += unclaimedNeighbors * 20;

          // Bonus for connecting our territories
          const friendlyNeighbors = adjacentToTarget.filter(
            (s) => s.owner === player,
          ).length;
          score += friendlyNeighbors * 10;

          return [
            {
              message: `Exploring from system ${from.id} to ${to.id}`,
              from,
              to,
              units: unitsToSend,
              score,
            } satisfies BotMove,
          ];
        }

        return [];
      });
    });
  }

  function getExpandMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships <= 1) return [];

      const fromThreatLevel = threatLevels.get(from.id) || 0;
      if (fromThreatLevel > 0) return []; // Prioritize defense over expansion

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== player) return [];

        const units = Math.floor(
          (from.ships - to.ships) * (1 - personality.defensiveness),
        );
        const min = (1 - personality.riskTolerance) * (from.homeworld ? 10 : 1);

        if (units > min && to.ships + 2 < from.ships) {
          const score = -to.ships; // Prefer weaker friendly systems
          return [
            {
              message: `Expanding from system ${from.id} to ${to.id}`,
              from,
              to,
              units,
              score,
            } satisfies BotMove,
          ];
        }

        return [];
      });
    });
  }
}

function scoreSort(a: BotMove, b: BotMove) {
  // First, compare by the 'score' value
  if (a.score !== b.score) {
    return a.score - b.score; // Sort in ascending order of score
  }

  // If scores are equal, randomize their order
  return Math.random() - 0.5;
}

// @eslint-disable-next-line @typescript-eslint/no-unused-vars
function chooseMoves(moves: BotMove[][], _weight = 1) {
  if (moves.length === 0) return;
  // moves = moves.slice(0, moves.length * weight);

  moves.forEach((systemMoves) => {
    // if (Math.random() > weight) return;

    // For each system's possible moves, pick one
    if (systemMoves.length === 0) return;
    const moves = [...systemMoves].sort(scoreSort);
    const move = moves[0];
    queueMove(move.from, move.to, move.units, move.message);
  });
}

function getAdjacentSystems(system: System): System[] {
  return system.lanes.map((lane) =>
    lane.from === system ? lane.to : lane.from,
  );
}
