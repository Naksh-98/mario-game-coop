/**
 * Grid utility functions for the Level Editor.
 * Handles pixel-to-grid conversion, grid-to-pixel conversion,
 * and property value clamping.
 */

// Grid and layout constants
export const GRID_SIZE = 32;
export const CANVAS_COLS = 266;
export const CANVAS_ROWS = 15;
export const VIEWPORT_WIDTH = 640;
export const VIEWPORT_HEIGHT = 440;
export const TOOLBAR_HEIGHT = 40;
export const PALETTE_WIDTH = 160;

/**
 * Snaps pixel coordinates to the nearest 32px grid boundary,
 * returning the grid column and row.
 *
 * Uses Math.round so that coordinates are snapped to the *nearest*
 * grid cell boundary rather than always flooring.
 */
export function snapToGrid(x: number, y: number): { col: number; row: number } {
  const col = Math.round(x / GRID_SIZE);
  const row = Math.round(y / GRID_SIZE);
  return { col, row };
}

/**
 * Converts grid column and row coordinates back to pixel positions.
 * Returns the top-left pixel coordinate of the given grid cell.
 */
export function gridToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * GRID_SIZE,
    y: row * GRID_SIZE,
  };
}

/**
 * Clamps a numeric value to the given [min, max] range.
 * Returns `min` if value < min, `max` if value > max,
 * otherwise returns the value unchanged.
 */
export function clampProperty(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
