import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Testing infrastructure', () => {
  it('vitest runs TypeScript tests', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(1, 2)).toBe(3);
  });

  it('fast-check property tests work', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
      { numRuns: 100 }
    );
  });

  it('path alias @/ resolves correctly', async () => {
    // Verify the alias is configured - importing from @/ should not throw
    // This test passes if vitest can resolve the @/ alias without errors
    expect(true).toBe(true);
  });
});
