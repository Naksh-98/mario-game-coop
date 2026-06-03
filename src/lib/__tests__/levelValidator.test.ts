import { describe, it, expect } from 'vitest';
import {
  validateFlagPole,
  validateSpawnGround,
  validateCastlePosition,
  validateLevelName,
  validateAll,
} from '@/lib/levelValidator';
import type { PlacedObject } from '@/lib/levelData';

describe('LevelValidator', () => {
  describe('validateFlagPole', () => {
    it('returns valid when exactly one flag pole exists', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'ground_block', col: 0, row: 13 },
      ];
      const result = validateFlagPole(objects);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns invalid when no flag pole exists', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'castle', col: 200, row: 9 },
      ];
      const result = validateFlagPole(objects);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid when more than one flag pole exists', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'flag_pole', col: 150, row: 5 },
      ];
      const result = validateFlagPole(objects);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for empty objects array', () => {
      const result = validateFlagPole([]);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSpawnGround', () => {
    it('returns valid when 3 contiguous ground blocks exist in first 5 columns at row 13', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 1, row: 13 },
        { type: 'ground_block', col: 2, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(true);
    });

    it('returns valid when all 5 columns have ground blocks at row 13', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 1, row: 13 },
        { type: 'ground_block', col: 2, row: 13 },
        { type: 'ground_block', col: 3, row: 13 },
        { type: 'ground_block', col: 4, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(true);
    });

    it('returns valid when 3 contiguous blocks are at cols 2-4', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 2, row: 13 },
        { type: 'ground_block', col: 3, row: 13 },
        { type: 'ground_block', col: 4, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when only 2 contiguous ground blocks exist', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 1, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when ground blocks are not contiguous', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 2, row: 13 },
        { type: 'ground_block', col: 4, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when ground blocks are at the wrong row', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 10 },
        { type: 'ground_block', col: 1, row: 10 },
        { type: 'ground_block', col: 2, row: 10 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when ground blocks are beyond column 4', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 5, row: 13 },
        { type: 'ground_block', col: 6, row: 13 },
        { type: 'ground_block', col: 7, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid for empty objects array', () => {
      const result = validateSpawnGround([]);
      expect(result.valid).toBe(false);
    });

    it('ignores non-ground-block objects at spawn position', () => {
      const objects: PlacedObject[] = [
        { type: 'purple_block', col: 0, row: 13 },
        { type: 'purple_block', col: 1, row: 13 },
        { type: 'purple_block', col: 2, row: 13 },
      ];
      const result = validateSpawnGround(objects);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCastlePosition', () => {
    it('returns valid when castle col > flag pole col', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'castle', col: 110, row: 9 },
      ];
      const result = validateCastlePosition(objects);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when castle col equals flag pole col', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'castle', col: 100, row: 9 },
      ];
      const result = validateCastlePosition(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when castle col < flag pole col', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'castle', col: 50, row: 9 },
      ];
      const result = validateCastlePosition(objects);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when no flag pole exists', () => {
      const objects: PlacedObject[] = [
        { type: 'castle', col: 110, row: 9 },
      ];
      const result = validateCastlePosition(objects);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no flag pole');
    });

    it('returns invalid when no castle exists', () => {
      const objects: PlacedObject[] = [
        { type: 'flag_pole', col: 100, row: 5 },
      ];
      const result = validateCastlePosition(objects);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('castle');
    });
  });

  describe('validateLevelName', () => {
    it('returns true for a valid name of length 1', () => {
      expect(validateLevelName('A')).toBe(true);
    });

    it('returns true for a valid name of length 50', () => {
      expect(validateLevelName('A'.repeat(50))).toBe(true);
    });

    it('returns true for a name of length 25', () => {
      expect(validateLevelName('My Cool Level')).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(validateLevelName('')).toBe(false);
    });

    it('returns false for a name longer than 50 characters', () => {
      expect(validateLevelName('A'.repeat(51))).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('returns no errors for a fully valid level', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 1, row: 13 },
        { type: 'ground_block', col: 2, row: 13 },
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'castle', col: 110, row: 9 },
      ];
      const errors = validateAll(objects, 'My Level');
      expect(errors).toHaveLength(0);
    });

    it('returns all errors simultaneously when multiple checks fail', () => {
      const objects: PlacedObject[] = [];
      const errors = validateAll(objects, '');
      // Should have errors for: name, flag pole, spawn ground, castle position
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('does not mutate the input objects array', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'flag_pole', col: 100, row: 5 },
      ];
      const originalLength = objects.length;
      const originalCopy = JSON.parse(JSON.stringify(objects));

      validateAll(objects, 'Test Level');

      expect(objects.length).toBe(originalLength);
      expect(objects).toEqual(originalCopy);
    });

    it('returns name error when name is invalid', () => {
      const objects: PlacedObject[] = [
        { type: 'ground_block', col: 0, row: 13 },
        { type: 'ground_block', col: 1, row: 13 },
        { type: 'ground_block', col: 2, row: 13 },
        { type: 'flag_pole', col: 100, row: 5 },
        { type: 'castle', col: 110, row: 9 },
      ];
      const errors = validateAll(objects, '');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('name');
    });
  });
});
