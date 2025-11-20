import { queueMove } from "./actions";
import { NumBots, NumHumanPlayers } from "./constants";
import { debugLog } from "./logging";
import { state } from "./state";
import type { BotMove, System } from "./types";

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

  const defenseMoves = getDefenseMoves(botSystems, player);
  chooseMoves(defenseMoves, 1.0 - personality.defensiveness);

  const eXterminate = getExterminateMoves(botSystems, player);
  chooseMoves(eXterminate, personality.defensiveness);

  const eXplore = getExploreMoves(botSystems, player);
  chooseMoves(eXplore, personality.expansion);

  const eXpand = getExpandMoves(botSystems, player);
  chooseMoves(eXpand, 1.0 - personality.defensiveness);

  function getDefenseMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships <= 1) return [];

      const fromThreatLevel = threatLevels.get(from.id) || 0;

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== player) return [];

        const toThreatLevel = threatLevels.get(to.id) || 0;

        const unitsToSend = Math.floor(
          from.ships * (1 - personality.defensiveness),
        );
        const minUnits =
          (1 - personality.riskTolerance) * (from.homeworld ? 50 : 1);

        if (unitsToSend > minUnits && toThreatLevel > fromThreatLevel) {
          return [
            {
              from,
              to,
              type: "defend",
              score: toThreatLevel - fromThreatLevel,
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
      // if (from.homeworld === player) return []; // Don't attack from homeworlds

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner === player || to.owner === null) return [];

        const unitsToSend = Math.floor(
          from.ships * (1 - personality.defensiveness),
        );
        const advantage = unitsToSend - to.ships;

        const minAdvantage = (1 - personality.riskTolerance) * 5;

        if (
          advantage > minAdvantage ||
          (advantage > -3 && personality.riskTolerance > 0.6)
        ) {
          let score = advantage * 5;

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

          return [{ to, from, type: "exterminate", score } satisfies BotMove];
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

          return [{ to, from, type: "explore", score } satisfies BotMove];
        }

        return [];
      });
    });
  }

  function getExpandMoves(systems: System[], player: number) {
    return systems.map((from) => {
      if (from.moveQueue.length > 0) return []; // Already has a move queued
      if (from.ships <= 1) return [];

      const adjacentSystems = from.lanes.map((l) =>
        l.from === from ? l.to : l.from,
      );
      const atRisk = adjacentSystems.filter(
        (s) => s.owner && s.owner !== player,
      ).length;
      if (atRisk > 0) return []; // Prioritize defense over expansion

      return from.lanes.flatMap((lane) => {
        const to = lane.from === from ? lane.to : lane.from;
        if (to.owner !== player) return [];

        const unitsToSend = Math.floor(
          from.ships * (1 - personality.defensiveness),
        );
        const minUnits =
          (1 - personality.riskTolerance) * (from.homeworld ? 50 : 1);

        if (unitsToSend > minUnits) {
          const score = (to.ships - from.ships) * -10 + 20; // Prefer weaker friendly systems
          return [{ from, to, type: "expand", score } satisfies BotMove];
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

function chooseMoves(moves: BotMove[][], weight = 1) {
  if (moves.length === 0) return;
  // moves = moves.slice(0, moves.length * weight);

  moves.forEach((systemMoves) => {
    if (Math.random() > weight) return;

    // For each system's possible moves, pick one at random
    if (systemMoves.length === 0) return;
    const moves = [...systemMoves].sort(scoreSort);
    const move = moves[0];

    switch (move.type) {
      case "exterminate": {
        const attackingShips = move.from.ships! - 1;
        queueMove(move.from, move.to, attackingShips);
        break;
      }
      case "explore": {
        const attackingShips = Math.floor(move.from.ships / 2) - 1;
        queueMove(move.from, move.to, attackingShips);
        break;
      }
      case "expand": {
        const deltaShips =
          Math.floor((move.from.ships - move.to.ships) / 2) - 1;
        queueMove(move.from, move.to, deltaShips);
        break;
      }
      case "defend": {
        const deltaShips = move.from.ships! - 1;
        queueMove(move.from, move.to, deltaShips);
        break;
      }
    }
  });
}

function getAdjacentSystems(system: System): System[] {
  return system.lanes.map((lane) =>
    lane.from === system ? lane.to : lane.from,
  );
}
