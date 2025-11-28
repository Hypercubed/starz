import { setState, isHost, getState } from 'playroomkit';

import { state } from '../game/state';
import { Graph } from '../classes/graph';

export function syncState() {
  if (isHost()) {
    setState('tick', state.tick, false);
    setState('world', state.world.toJSON(), false);
    // setState("state", { ...state, world: undefined, players: undefined }, false);
    // setState("players", state.players.map(p => ({ ...p, bot: undefined })), false);
  } else {
    state.tick = getState('tick');

    const world = getState('world');
    state.world = world ? Graph.fromJSON(world) : state.world;

    // const players = getState("players");
    // state.players = players ?? state.players;

    // const s = getState("state") as typeof state;
    // Object.assign(state, { messages: s.messages });
  }
}
