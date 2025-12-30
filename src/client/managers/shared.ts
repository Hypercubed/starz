import type { PartykitGameManager } from './partykit';
import type { PlayroomGameManager } from './playroom';

export function isPartykitGameManager(
  manager: any
): manager is PartykitGameManager {
  return manager.name === 'PartykitGameManager';
}

export function isPlayroomGameManager(
  manager: any
): manager is PlayroomGameManager {
  return manager.name === 'PlayroomGameManager';
}
