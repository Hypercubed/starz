import {
  MAX_SHIPS_PER_SYSTEM,
  SHIPS_PER_ROUND,
  SHIPS_PER_TURN,
  TICKS_PER_ROUND,
  TICKS_PER_TURN
} from '../constants.ts';

import { doQueuedMoves } from './actions.ts';
import { botQueue } from './bots.ts';
import { GAME_STATUS, type FnContext } from '../managers/types.ts';
import type { GameState } from './types.ts';
import { addMessage } from './state.ts';

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
    if (system.type === 'inhabited' && system.ownerId != null) {
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

export function checkVictory({ G, C, E }: FnContext) {
  if (G.players.length === 1) return;
  if (C.gameState !== GAME_STATUS.PLAYING) return;

  // TODO: Use stats from state
  const homeworlds = G.world.systems.filter(
    (system) => system.homeworld && system.ownerId === system.homeworld
  );

  if (homeworlds.length === 1) {
    const winnerId = homeworlds[0].ownerId!;
    const winner = G.playerMap.get(winnerId)!;

    addMessage(G, `Player ${winner.name} has conquered The Bubble!`);

    E.stopGame();

    if (winnerId === G.thisPlayerId) {
      E.playerWin();
    } else {
      E.playerLose(winnerId);
    }
  }
}

export function gameTick({ G, E, C }: FnContext) {
  G.tick++;

  if (G.tick % TICKS_PER_TURN === 0) turnUpdate(G);
  if (G.tick % TICKS_PER_ROUND === 0) roundUpdate(G);

  botQueue();
  doQueuedMoves({ G, E, C });
  updateStats(G);
}
