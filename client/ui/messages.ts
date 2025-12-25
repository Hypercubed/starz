import type { Messages } from '../types';

let messageIdCounter = 0;
const messages: Messages[] = []; // Move this?

export function clearMessages() {
  messageIdCounter = 0;
  messages.length = 0;

  const { E } = globalThis.gameManager!.getFnContext();
  E.emit('MESSAGES_UPDATED', { messages });
}

export function addMessage(message: string) {
  const { C, E } = globalThis.gameManager!.getFnContext();

  messages.push({
    id: messageIdCounter++,
    message,
    tick: C.tick
  });

  E.emit('MESSAGES_UPDATED', { messages });
}
