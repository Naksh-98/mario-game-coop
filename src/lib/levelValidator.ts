/**
 * Level validation module for the Level Editor.
 * Pre-save validation checks: flag pole, spawn ground, castle position, level name.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.3
 */

import type { PlacedObject } from '@/lib/levelData';

// --- Types ---

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationError {
  message: string;
}

// --- Constants ---

/** The ground-level row where players spawn */
const SPAWN_ROW = 13;

/** Number of columns from the left edge to check for spawn ground */
const SPAWN_COLUMNS = 5;

/** Minimum contiguous ground blocks required at spawn */
const MIN_SPAWN_GROUND = 3;

// --- Validation Functions ---

/**
 * Validates that exactly one flag pole exists in the level.
 * Requirement 6.1: THE Level_Editor SHALL verify that exactly one flag pole exists.
 */
export function validateFlagPole(objects: PlacedObject[]): ValidationResult {
  const flagPoles = objects.filter((obj) => obj.type === 'flag_pole');

  if (flagPoles.length === 0) {
    return { valid: false, error: 'Level must contain exactly one flag pole' };
  }

  if (flagPoles.length > 1) {
    return { valid: false, error: 'Level must contain exactly one flag pole' };
  }

  return { valid: true };
}

/**
 * Validates that at least 3 contiguous ground blocks exist within the first 5
 * columns (0–4) at the spawn row (row 13).
 * Requirement 6.2: contiguous row of at least 3 ground blocks at spawn height.
 */
export function validateSpawnGround(objects: PlacedObject[]): ValidationResult {
  // Find ground blocks at spawn row within first 5 columns (0–4)
  const groundCols = new Set<number>();

  for (const obj of objects) {
    if (obj.type === 'ground_block' && obj.row === SPAWN_ROW && obj.col >= 0 && obj.col < SPAWN_COLUMNS) {
      groundCols.add(obj.col);
    }
  }

  // Check for at least 3 contiguous columns
  let maxContiguous = 0;
  let currentContiguous = 0;

  for (let col = 0; col < SPAWN_COLUMNS; col++) {
    if (groundCols.has(col)) {
      currentContiguous++;
      if (currentContiguous > maxContiguous) {
        maxContiguous = currentContiguous;
      }
    } else {
      currentContiguous = 0;
    }
  }

  if (maxContiguous >= MIN_SPAWN_GROUND) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Level must have at least 3 contiguous ground blocks at spawn position (first 5 columns, row 13)',
  };
}

/**
 * Validates that the castle is positioned to the right of the flag pole.
 * Requirement 6.3: castle col > flag pole col.
 * If either flag pole or castle is missing, validation fails with a descriptive error.
 */
export function validateCastlePosition(objects: PlacedObject[]): ValidationResult {
  const flagPole = objects.find((obj) => obj.type === 'flag_pole');
  const castle = objects.find((obj) => obj.type === 'castle');

  if (!flagPole) {
    return { valid: false, error: 'Cannot validate castle position: no flag pole found' };
  }

  if (!castle) {
    return { valid: false, error: 'Level must contain a castle positioned after the flag pole' };
  }

  if (castle.col > flagPole.col) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Castle must be positioned to the right of the flag pole',
  };
}

/**
 * Validates level name length is between 1 and 50 characters inclusive.
 * Requirement 5.3: level name between 1 and 50 characters.
 */
export function validateLevelName(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

/**
 * Runs all validation checks and returns all errors simultaneously.
 * Requirements 6.4, 6.5: display all errors simultaneously; never mutate input.
 * This function does NOT mutate the input objects array.
 */
export function validateAll(objects: PlacedObject[], name: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate level name
  if (!validateLevelName(name)) {
    errors.push({ message: 'Level name must be between 1 and 50 characters' });
  }

  // Validate flag pole
  const flagPoleResult = validateFlagPole(objects);
  if (!flagPoleResult.valid && flagPoleResult.error) {
    errors.push({ message: flagPoleResult.error });
  }

  // Validate spawn ground
  const spawnResult = validateSpawnGround(objects);
  if (!spawnResult.valid && spawnResult.error) {
    errors.push({ message: spawnResult.error });
  }

  return errors;
}
