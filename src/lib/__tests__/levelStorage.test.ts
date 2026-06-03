import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLevel,
  loadAll,
  deleteLevel,
  getLevelBySlot,
  isStorageAvailable,
  downloadAsFile,
} from '@/lib/levelStorage';
import type { SavedLevelEntry, LevelData } from '@/lib/levelData';

// Mock localStorage for testing
const mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
  get length() {
    return Object.keys(mockStorage).length;
  },
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

function makeLevelData(name = 'Test Level', createdAt?: string): LevelData {
  return {
    name,
    createdAt: createdAt ?? '2024-01-15T10:00:00.000Z',
    objects: [
      { type: 'ground_block', col: 0, row: 13 },
      { type: 'flag_pole', col: 50, row: 5 },
      { type: 'castle', col: 55, row: 9 },
    ],
    version: 1,
  };
}

function makeEntry(overrides: Partial<SavedLevelEntry> = {}): SavedLevelEntry {
  return {
    id: overrides.id ?? 'test-id-1',
    name: overrides.name ?? 'Test Level',
    createdAt: overrides.createdAt ?? '2024-01-15T10:00:00.000Z',
    slotNumber: overrides.slotNumber,
    data: overrides.data ?? makeLevelData(),
  };
}

describe('LevelStorage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('isStorageAvailable', () => {
    it('returns true when localStorage is accessible', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('returns false when localStorage throws', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage disabled');
      });
      expect(isStorageAvailable()).toBe(false);
    });
  });

  describe('saveLevel', () => {
    it('saves a new level to localStorage', () => {
      const entry = makeEntry();
      saveLevel(entry);

      const stored = JSON.parse(mockStorage['mario_custom_levels']);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('test-id-1');
    });

    it('updates an existing level with the same id', () => {
      const entry1 = makeEntry({ name: 'Original' });
      saveLevel(entry1);

      const entry2 = makeEntry({ name: 'Updated' });
      saveLevel(entry2);

      const stored = JSON.parse(mockStorage['mario_custom_levels']);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Updated');
    });

    it('appends a new level with different id', () => {
      saveLevel(makeEntry({ id: 'id-1' }));
      saveLevel(makeEntry({ id: 'id-2' }));

      const stored = JSON.parse(mockStorage['mario_custom_levels']);
      expect(stored).toHaveLength(2);
    });

    it('throws QuotaExceededError when storage is full', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const err = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw err;
      });

      expect(() => saveLevel(makeEntry())).toThrow();
    });
  });

  describe('loadAll', () => {
    it('returns empty array when no data exists', () => {
      expect(loadAll()).toEqual([]);
    });

    it('returns valid entries sorted by createdAt descending', () => {
      const entries = [
        makeEntry({ id: '1', createdAt: '2024-01-10T00:00:00.000Z', data: makeLevelData('A', '2024-01-10T00:00:00.000Z') }),
        makeEntry({ id: '2', createdAt: '2024-01-20T00:00:00.000Z', data: makeLevelData('B', '2024-01-20T00:00:00.000Z') }),
        makeEntry({ id: '3', createdAt: '2024-01-15T00:00:00.000Z', data: makeLevelData('C', '2024-01-15T00:00:00.000Z') }),
      ];
      mockStorage['mario_custom_levels'] = JSON.stringify(entries);

      const loaded = loadAll();
      expect(loaded).toHaveLength(3);
      expect(loaded[0].id).toBe('2'); // most recent
      expect(loaded[1].id).toBe('3');
      expect(loaded[2].id).toBe('1'); // oldest
    });

    it('skips corrupted entries without crashing', () => {
      const raw = [
        makeEntry({ id: '1' }),
        { broken: true }, // corrupted - missing required fields
        makeEntry({ id: '2' }),
        null, // completely invalid
        'not an object', // not even an object
      ];
      mockStorage['mario_custom_levels'] = JSON.stringify(raw);

      const loaded = loadAll();
      expect(loaded).toHaveLength(2);
      expect(loaded.map((e) => e.id)).toContain('1');
      expect(loaded.map((e) => e.id)).toContain('2');
    });

    it('returns empty array when entire storage is corrupted JSON', () => {
      mockStorage['mario_custom_levels'] = 'not valid json{{{';
      expect(loadAll()).toEqual([]);
    });

    it('returns empty array when storage contains non-array JSON', () => {
      mockStorage['mario_custom_levels'] = JSON.stringify({ notAnArray: true });
      expect(loadAll()).toEqual([]);
    });

    it('excludes entries with missing data.version', () => {
      const badEntry = {
        id: 'bad',
        name: 'Bad',
        createdAt: '2024-01-01T00:00:00.000Z',
        data: { name: 'Bad', createdAt: '2024-01-01T00:00:00.000Z', objects: [] },
        // missing version
      };
      mockStorage['mario_custom_levels'] = JSON.stringify([badEntry]);
      expect(loadAll()).toEqual([]);
    });
  });

  describe('deleteLevel', () => {
    it('removes a level by id', () => {
      const entries = [makeEntry({ id: '1' }), makeEntry({ id: '2' })];
      mockStorage['mario_custom_levels'] = JSON.stringify(entries);

      deleteLevel('1');

      const stored = JSON.parse(mockStorage['mario_custom_levels']);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('2');
    });

    it('does nothing when id does not exist', () => {
      const entries = [makeEntry({ id: '1' })];
      mockStorage['mario_custom_levels'] = JSON.stringify(entries);

      deleteLevel('nonexistent');

      const stored = JSON.parse(mockStorage['mario_custom_levels']);
      expect(stored).toHaveLength(1);
    });
  });

  describe('getLevelBySlot', () => {
    it('returns the level assigned to the given slot', () => {
      const entries = [
        makeEntry({ id: '1', slotNumber: 6 }),
        makeEntry({ id: '2', slotNumber: 7 }),
      ];
      mockStorage['mario_custom_levels'] = JSON.stringify(entries);

      const result = getLevelBySlot(6);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('1');
    });

    it('returns null when no level is assigned to the slot', () => {
      const entries = [makeEntry({ id: '1', slotNumber: 6 })];
      mockStorage['mario_custom_levels'] = JSON.stringify(entries);

      expect(getLevelBySlot(8)).toBeNull();
    });

    it('returns null when no levels exist', () => {
      expect(getLevelBySlot(6)).toBeNull();
    });
  });

  describe('downloadAsFile', () => {
    it('is exported as a function', () => {
      // downloadAsFile requires a browser DOM (document, URL.createObjectURL).
      // We verify it's a callable function; full integration testing requires
      // a jsdom or browser environment.
      expect(typeof downloadAsFile).toBe('function');
    });
  });
});
