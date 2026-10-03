/**
 * Last-known linked children of docs in the navigation panel, keyed by `workspaceId:docId`.
 *
 * Expanding a doc in the sidebar has to wait for the indexer before its children can be shown.
 * We render the last-known children immediately and replace them when the live answer arrives.
 *
 * Kept in memory and mirrored to localStorage (capped, least recently written entries are dropped).
 */

const STORAGE_KEY = 'affine:navigation-panel:doc-children-cache';
const MAX_ENTRIES = 500;
const PERSIST_DELAY = 1000;

let cache: Map<string, string[]> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function load(): Map<string, string[]> {
  if (cache) {
    return cache;
  }
  cache = new Map();
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (
          Array.isArray(entry) &&
          typeof entry[0] === 'string' &&
          Array.isArray(entry[1]) &&
          entry[1].every((id: unknown) => typeof id === 'string')
        ) {
          cache.set(entry[0], entry[1]);
        }
      }
    }
  } catch {
    // ignore broken or inaccessible storage
  }
  return cache;
}

function schedulePersist() {
  if (persistTimer) {
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(load().entries()))
      );
    } catch {
      // ignore quota / inaccessible storage
    }
  }, PERSIST_DELAY);
}

export function docChildrenCacheKey(workspaceId: string, docId: string) {
  return `${workspaceId}:${docId}`;
}

export function getCachedDocChildren(key: string): string[] | undefined {
  return load().get(key);
}

export function setCachedDocChildren(key: string, children: string[]) {
  const map = load();
  const prev = map.get(key);
  if (
    prev &&
    prev.length === children.length &&
    prev.every((id, index) => id === children[index])
  ) {
    return;
  }
  // re-insert to keep the most recently written entries at the end
  map.delete(key);
  map.set(key, children);
  while (map.size > MAX_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
  schedulePersist();
}
