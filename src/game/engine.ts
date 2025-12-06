import {
  MAX_SHIPS_PER_SYSTEM,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from '../constants.ts';

import { doQueuedMoves } from './actions.ts';
import { botQueue } from './bots.ts';
import { addMessage } from './state.ts';

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

  // if (state.tick % 10 === 0) {
  //   console.log(`Tick ${state.tick} Stats:`);
  //   state.players.forEach((p) => {
  //     console.log(
  //       `Player ${p.id}: Systems=${p.stats.systems}, Ships=${p.stats.ships}, Homeworld=${p.stats.homeworld}`,
  //     );
  //   });
  // }
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

export function checkVictory({ G, C }: FnContext) {
  if (C.gameState !== 'PLAYING') return;

  let isWin = false;
  let isLoss = false;

  if (G.players.length > 1) {
    // Check for conquest victory
    const homeworlds = G.world.systems.filter(
      (system) => system.homeworld && system.ownerId === system.homeworld
    );

    if (homeworlds.length === 1) {
      const winnerId = homeworlds[0].ownerId!;
      const winner = G.playerMap.get(winnerId)!;

      addMessage(G, `Player ${winner.name} has conquered The Bubble!`);

      isWin = winnerId === G.thisPlayerId;
      isLoss = !isWin;
    }
  } else {
    // Check for domination victory
    const systems = G.world.systems.filter(
      (system) => system.ownerId !== G.thisPlayerId
    );

    if (systems.length === 0) {
      const winner = G.playerMap.get(G.thisPlayerId!)!;
      addMessage(G, `Player ${winner.name} has conquered The Bubble!`);
      isWin = true;
      isLoss = false;
    }
  }

  if (isWin) {
    globalThis.gameManager.events.emit('GAME_STOP', undefined);
    globalThis.gameManager.events.emit('PLAYER_WIN', {
      playerId: G.thisPlayerId!
    });
  } else if (isLoss) {
    globalThis.gameManager.events.emit('GAME_STOP', undefined);
    globalThis.gameManager.events.emit('PLAYER_LOSE', {
      playerId: G.thisPlayerId!,
      winnerId: null
    });
  }
}

export function gameTick(ctx: FnContext) {
  const { G } = ctx;

  G.tick++;
  if (G.tick % TICKS_PER_TURN === 0) turnUpdate(G);
  if (G.tick % TICKS_PER_ROUND === 0) roundUpdate(G);

  botQueue(ctx);
  doQueuedMoves(ctx);
  updateStats(G);
}
