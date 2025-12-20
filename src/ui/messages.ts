import type { Messages } from '../types';

let messageIdCounter = 0;
const messages: Messages[] = [];

export function clearMessages() {
  messageIdCounter = 0;
  messages.length = 0;

  const { E } = globalThis.gameManager!.getContext();
  E.emit('MESSAGES_UPDATED', { messages });
}

export function addMessage(message: string) {
  const { C, E } = globalThis.gameManager!.getContext();

  messages.push({
    id: messageIdCounter++,
    message,
    tick: C.tick
  });

  E.emit('MESSAGES_UPDATED', { messages });
}
