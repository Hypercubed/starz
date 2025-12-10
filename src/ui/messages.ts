import * as d3 from 'd3';

import type { Messages } from "../types";

let messageIdCounter = 0;
const messages: Messages[] = [];

export function clearMessages() {
  messageIdCounter = 0;
  messages.length = 0;
}

export function addMessage(message: string) {
  const { C } = globalThis.gameManager!.getContext();

  const html = `${message} <small>${~~(C.tick / 2)}${C.tick % 2 === 1 ? '.' : ''}</small>`;
  messages.push({
    id: messageIdCounter++,
    message,
    tick: C.tick,
    html
  });
}

export function updateMessageBox() {
  const state = globalThis.gameManager.getState();

  const box = d3
    .select('#app')
    .selectAll('#messagebox')
    .data([null])
    .join((enter) => enter.append('div').attr('id', 'messagebox'));

  box
    .selectAll('div')
    .data(state.messages.slice(-5), (d: any) => d.id)
    .join('div')
    .html((d) => d.html);
}