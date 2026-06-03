// src/lib/levelStorage.ts
// localStorage CRUD for custom levels.
// Requirements: 5.2, 5.4, 5.6, 7.1, 7.3, 7.5

import type { LevelData, SavedLevelEntry } from '@/lib/levelData';

const STORAGE_KEY = 'mario_custom_levels';

/**
 * Check whether localStorage is accessible.
 * Returns false in private browsing, when storage is disabled,
 * or when any other error prevents access.
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a level entry to localStorage.
 * Merges with existing entries (updates if same id exists, appends otherwise).
 * Throws QuotaExceededError if storage is full — caller should handle with downloadAsFile.
 */
export function saveLevel(entry: SavedLevelEntry): void {
  const entries = loadAllRaw();
  const existingIndex = entries.findIndex((e) => (e as any)?.id === entry.id);

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  const json = JSON.stringify(entries);

  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      // Re-throw so the caller can offer file download as fallback
      throw err;
    }
    throw err;
  }
}

/**
 * Load all saved levels from localStorage.
 * Skips corrupted entries with per-entry try-catch.
 * Returns levels sorted by createdAt descending (most recent first).
 * Requirement 7.1: sorted by creation date descending.
 * Requirement 7.5: corrupted entries excluded from load/play.
 */
export function loadAll(): SavedLevelEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Entire storage is corrupted — return empty
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const validEntries: SavedLevelEntry[] = [];

  for (const item of parsed) {
    try {
      if (isValidSavedLevelEntry(item)) {
        validEntries.push(item as SavedLevelEntry);
      }
      // Invalid entries are silently skipped (excluded from load/play)
    } catch {
      // Corrupted entry — skip it
    }
  }

  // Sort by createdAt descending (most recent first)
  validEntries.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return validEntries;
}

/**
 * Delete a level by its id from localStorage.
 * Requirement 7.3: removes level data from localStorage.
 */
export function deleteLevel(id: string): void {
  const entries = loadAllRaw();
  const filtered = entries.filter((e) => {
    try {
      return (e as SavedLevelEntry).id !== id;
    } catch {
      // If entry can't be read, keep it (don't accidentally delete it)
      return true;
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Find a level assigned to a specific game slot number.
 * Returns null if no level is assigned to that slot.
 */
export function getLevelBySlot(slot: number): SavedLevelEntry | null {
  const entries = loadAll();
  return entries.find((e) => e.slotNumber === slot) ?? null;
}

/**
 * Trigger a file download of level data as JSON.
 * Used as a fallback when localStorage quota is exceeded or unavailable.
 * Requirement 5.6: offer file download as alternative.
 */
export function downloadAsFile(data: LevelData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// --- Internal helpers ---

/**
 * Load raw array from localStorage without validation or sorting.
 * Used internally for mutations (save, delete).
 */
function loadAllRaw(): unknown[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Storage corrupted — start fresh
  }

  return [];
}

/**
 * Validate that an unknown value matches the SavedLevelEntry shape.
 * Requirement 7.5: corrupted/invalid entries are identified and excluded.
 */
function isValidSavedLevelEntry(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const entry = item as Record<string, unknown>;

  // Required string fields
  if (typeof entry.id !== 'string' || entry.id.length === 0) return false;
  if (typeof entry.name !== 'string' || entry.name.length === 0) return false;
  if (typeof entry.createdAt !== 'string' || entry.createdAt.length === 0) return false;

  // slotNumber is optional but must be a number if present
  if (entry.slotNumber !== undefined && typeof entry.slotNumber !== 'number') return false;

  // data must be a valid LevelData object
  if (typeof entry.data !== 'object' || entry.data === null) return false;

  const data = entry.data as Record<string, unknown>;
  if (typeof data.name !== 'string') return false;
  if (typeof data.createdAt !== 'string') return false;
  if (!Array.isArray(data.objects)) return false;
  if (data.version !== 1) return false;

  return true;
}
