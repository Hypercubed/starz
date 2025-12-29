import type { PartykitGameManager } from './partykit';

export function isPartykitGameManager(
  manager: any
): manager is PartykitGameManager {
  return manager.name === 'PartykitGameManager';
}
