import {
  MAX_SHIPS_PER_SYSTEM,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from '../constants.ts';

import { doQueuedMoves } from './actions.ts';
import { botQueue } from './bots.ts';

import type { GameState } from './types.ts';
import type { FnContext } from '../managers/types.d.ts';

export function updateStats(state: GameState) {
  state.players.forEach((player) => {
    const systems = state.world.systems.filter(
      (system) => system.ownerId === player.id
    );
    const homeworld = systems.find((system) => system.homeworld === player.id);
    const ships = systems.reduce((sum, system) => sum + (system.ships ?? 0), 0);
    player.stats = {
      playerId: player.id,
      systems: systems.length,
      ships,
      homeworld: homeworld?.ships ?? 0
    };
  });
}

export function turnUpdate(state: GameState) {
  state.world.systems.forEach((system) => {
    if (system.type === 'INHABITED' && system.ownerId != null) {
      if (system.ownerId || system.ships < MAX_SHIPS_PER_SYSTEM) {
        system.ships = (system.ships ?? 0) + SHIPS_PER_TURN;
      }
    }
  });
}

export function roundUpdate(state: GameState) {
  state.world.systems.forEach((system) => {
    if (system.ownerId != null) {
      system.ships = (system.ships ?? 0) + SHIPS_PER_ROUND;
    }
  });
}

export function checkVictory({ S, C, E, P }: FnContext) {
  if (C.status !== 'PLAYING') return;

  if (S.players.length > 1) {
    // Check for conquest victory
    const homeworlds = S.world.systems.filter(
      (system) => system.homeworld && system.ownerId === system.homeworld
    );

    if (homeworlds.length === 1) {
      const winnerId = homeworlds[0].ownerId!;
      const winner = S.playerMap.get(winnerId)!;

      E.emit('PLAYER_WIN', {
        playerId: C.playerId,
        message: `Player ${winner.name} has conquered The Bubble!`
      });
      E.emit('GAME_STOP', undefined);
    }
  } else {
    // Check for domination victory
    const systems = S.world.systems.filter(
      (system) => system.ownerId !== C.playerId
    );

    if (systems.length === 0) {
      E.emit('PLAYER_WIN', {
        playerId: C.playerId,
        message: `Player ${P.name} has conquered The Bubble!`
      });
      E.emit('GAME_STOP', undefined);
    }
  }
}

export function gameTick(ctx: FnContext) {
  const { S, C } = ctx;

  if (C.tick % TICKS_PER_TURN === 0) turnUpdate(S);
  if (C.tick % TICKS_PER_ROUND === 0) roundUpdate(S);

  for (const s of S.world.systems) {
    s.movement = [0, 0];
  }

  for (const l of S.world.lanes) {
    l.movement = [0, 0];
  }

  botQueue(ctx);
  doQueuedMoves(ctx);
  updateStats(S);
}
