import { getAdjacentSystems } from '../game/world.ts';

import type { FnContext } from '../managers/types';

export const selection = {
  all: new Set<string>(),
  last: null as string | null
};

export function clearSelection() {
  selection.all.clear();
  selection.last = null;
}

export function select(id: string) {
  selection.all.add(id);
  selection.last = id;
}

export function selectOnly(id: string) {
  selection.all.clear();
  selection.all.add(id);
  selection.last = id;
}

export function deselect(id: string) {
  selection.all.delete(id);
  if (selection.last === id) {
    selection.last = null;
  }
}

export function isSelected(id: string) {
  return selection.all.has(id);
}

export function toggleSelection(id: string) {
  if (isSelected(id)) {
    deselect(id);
  } else {
    select(id);
  }
}

export function selectPath({ G }: FnContext, systemId: string) {
  if (selection.last == null) return;

  // Simple BFS to find shortest path
  const queue: string[][] = [[selection.last]];
  const visited = new Set<string>();
  visited.add(selection.last);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === systemId) {
      // Found path
      path.forEach((id) => selection.all.add(id));
      selection.last = systemId;
      return;
    }
    for (const neighbor of getAdjacentSystems(G.world, current)) {
      if (!visited.has(neighbor.id) && neighbor.ownerId === G.thisPlayerId) {
        visited.add(neighbor.id);
        queue.push([...path, neighbor.id]);
      }
    }
  }
}
