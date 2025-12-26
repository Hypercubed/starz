import {
  MAX_SHIPS_PER_SYSTEM,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from '../constants.ts';

import { doQueuedMoves } from './actions.ts';
import { botQueue } from './bots.ts';

import type { GameState } from './types';
import type { FnContext } from '../managers/types';
import { GameEvents } from './shared.ts';

export function updateStats(state: GameState) {
  for (const player of state.playerMap.values()) {
    const stats = {
      playerId: player.id,
      systems: 0,
      ships: 0,
      homeworld: 0
    };

    for (const system of state.world.systemMap.values()) {
      if (system.ownerId === player.id) {
        stats.systems += 1;
        stats.ships += system.ships ?? 0;
        if (system.homeworld === player.id) {
          stats.homeworld = system.ships ?? 0;
        }
      }
    }

    player.stats = stats;
  }
}

export function turnUpdate(state: GameState) {
  for (const system of state.world.systemMap.values()) {
    if (system.type === 'INHABITED') {
      if (system.ownerId || system.ships < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  }
}

export function roundUpdate(state: GameState) {
  for (const system of state.world.systemMap.values()) {
    if (system.ownerId != null) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  }
}

export function checkVictory({ S, C, E, P }: FnContext) {
  if (C.status !== 'PLAYING') return;
  if (!P) return;

  if (S.playerMap.size > 1) {
    const players = Array.from(S.playerMap.values());

    const homeworldCount = players.reduce((count, player) => {
      count += player.stats.homeworld > 0 ? 1 : 0;
      return count;
    }, 0);

    if (homeworldCount === 1) {
      // Check for conquest victory
      const winnerId = players.find((player) => player.stats.homeworld > 0)!.id;
      const winner = S.playerMap.get(winnerId)!;

      E.emit(GameEvents.PLAYER_WIN, {
        playerId: winnerId,
        message: `${winner.name} has conquered The Bubble!`
      });
      E.emit(GameEvents.GAME_STOP, undefined);
    }
  } else {
    // Check for domination victory
    const systems = Array.from(S.world.systemMap.values()).filter(
      // TODO: Optimize?
      (system) => system.ownerId !== C.playerId
    );

    if (systems.length === 0) {
      E.emit(GameEvents.PLAYER_WIN, {
        playerId: C.playerId,
        message: `${P.name} has conquered The Bubble!`
      });
      E.emit(GameEvents.GAME_STOP, undefined);
    }
  }
}

export function gameTick(ctx: FnContext, skipBots = false) {
  const { S, C } = ctx;

  if (C.tick % TICKS_PER_TURN === 0) turnUpdate(S);
  if (C.tick % TICKS_PER_ROUND === 0) roundUpdate(S);

  for (const s of S.world.systemMap.values()) s.movement = [0, 0];
  for (const l of S.world.laneMap.values()) l.movement = [0, 0];

  if (!skipBots) {
    botQueue(ctx);
    doQueuedMoves(ctx);
  }

  updateStats(S);
}
