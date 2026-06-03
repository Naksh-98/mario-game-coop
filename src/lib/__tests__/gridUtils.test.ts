import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  gridToPixel,
  clampProperty,
  GRID_SIZE,
  CANVAS_COLS,
  CANVAS_ROWS,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  TOOLBAR_HEIGHT,
  PALETTE_WIDTH,
} from '../gridUtils';

describe('gridUtils constants', () => {
  it('exports correct constant values', () => {
    expect(GRID_SIZE).toBe(32);
    expect(CANVAS_COLS).toBe(266);
    expect(CANVAS_ROWS).toBe(15);
    expect(VIEWPORT_WIDTH).toBe(640);
    expect(VIEWPORT_HEIGHT).toBe(440);
    expect(TOOLBAR_HEIGHT).toBe(40);
    expect(PALETTE_WIDTH).toBe(160);
  });
});

describe('snapToGrid', () => {
  it('snaps exact grid boundaries to the correct cell', () => {
    expect(snapToGrid(0, 0)).toEqual({ col: 0, row: 0 });
    expect(snapToGrid(32, 32)).toEqual({ col: 1, row: 1 });
    expect(snapToGrid(64, 96)).toEqual({ col: 2, row: 3 });
  });

  it('snaps to the nearest grid cell (rounds)', () => {
    // 17 is more than half of 32, rounds up
    expect(snapToGrid(17, 17)).toEqual({ col: 1, row: 1 });
    // 15 is less than half of 32, rounds down
    expect(snapToGrid(15, 15)).toEqual({ col: 0, row: 0 });
  });

  it('handles midpoint (16) by rounding up', () => {
    // Math.round(0.5) = 1
    expect(snapToGrid(16, 16)).toEqual({ col: 1, row: 1 });
  });

  it('handles large pixel values', () => {
    expect(snapToGrid(8500, 448)).toEqual({ col: 266, row: 14 });
  });
});

describe('gridToPixel', () => {
  it('converts grid coords to pixel position', () => {
    expect(gridToPixel(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gridToPixel(1, 1)).toEqual({ x: 32, y: 32 });
    expect(gridToPixel(10, 5)).toEqual({ x: 320, y: 160 });
  });

  it('is the inverse of snapToGrid for exact boundaries', () => {
    const pixel = gridToPixel(5, 10);
    const grid = snapToGrid(pixel.x, pixel.y);
    expect(grid).toEqual({ col: 5, row: 10 });
  });
});

describe('clampProperty', () => {
  it('returns value unchanged when within range', () => {
    expect(clampProperty(5, 1, 10)).toBe(5);
    expect(clampProperty(1, 1, 10)).toBe(1);
    expect(clampProperty(10, 1, 10)).toBe(10);
  });

  it('clamps to min when value is below range', () => {
    expect(clampProperty(0, 1, 10)).toBe(1);
    expect(clampProperty(-5, 1, 10)).toBe(1);
  });

  it('clamps to max when value is above range', () => {
    expect(clampProperty(11, 1, 10)).toBe(10);
    expect(clampProperty(100, 1, 20)).toBe(20);
  });

  it('works for moving platform speed range [1, 10]', () => {
    expect(clampProperty(0, 1, 10)).toBe(1);
    expect(clampProperty(5, 1, 10)).toBe(5);
    expect(clampProperty(15, 1, 10)).toBe(10);
  });

  it('works for movement range [1, 20]', () => {
    expect(clampProperty(0, 1, 20)).toBe(1);
    expect(clampProperty(12, 1, 20)).toBe(12);
    expect(clampProperty(25, 1, 20)).toBe(20);
  });
});
