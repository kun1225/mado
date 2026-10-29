import { describe, expect, it } from 'vitest';

import {
  phaseProgress,
  pickActiveStep,
  splitIntoColumns,
  stepProgress,
  tilePose,
} from './landing-motion';

describe('phaseProgress', () => {
  it('maps progress inside a phase to 0 to 1', () => {
    expect(phaseProgress(0.5, 0.4, 0.6)).toBeCloseTo(0.5);
    expect(phaseProgress(0.4, 0.4, 0.6)).toBe(0);
    expect(phaseProgress(0.6, 0.4, 0.6)).toBe(1);
  });

  it('holds 0 before the phase and 1 after it', () => {
    expect(phaseProgress(0.1, 0.4, 0.6)).toBe(0);
    expect(phaseProgress(0.9, 0.4, 0.6)).toBe(1);
  });
});

describe('pickActiveStep', () => {
  it('splits progress into equal steps', () => {
    expect(pickActiveStep(0, 3)).toBe(0);
    expect(pickActiveStep(0.34, 3)).toBe(1);
    expect(pickActiveStep(0.9, 3)).toBe(2);
  });

  it('stays on the last step at the end and the first before the start', () => {
    expect(pickActiveStep(1, 3)).toBe(2);
    expect(pickActiveStep(-0.2, 3)).toBe(0);
  });
});

describe('stepProgress', () => {
  it('fills only the current step', () => {
    expect(stepProgress(0.5, 3, 0)).toBe(1);
    expect(stepProgress(0.5, 3, 1)).toBeCloseTo(0.5);
    expect(stepProgress(0.5, 3, 2)).toBe(0);
  });
});

describe('tilePose', () => {
  const slot = { left: 100, top: 200, width: 50, height: 100 };
  const stage = { width: 1000, height: 800 };
  const float = { x: 0.5, y: 0.5, scale: 0.6, rotate: -8 };

  it('starts at the float point, centered on it', () => {
    expect(tilePose(slot, stage, float, 0)).toEqual({
      x: 500 - 125,
      y: 400 - 250,
      scale: 0.6,
      rotate: -8,
    });
  });

  it('ends in its slot', () => {
    expect(tilePose(slot, stage, float, 1)).toEqual({
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
    });
  });

  it('clamps progress outside 0 to 1', () => {
    expect(tilePose(slot, stage, float, 2)).toEqual(
      tilePose(slot, stage, float, 1),
    );
  });
});

describe('splitIntoColumns', () => {
  const box = (id: string, height: number) => ({ id, width: 100, height });

  it('puts each tile in the shortest column, keeping order', () => {
    const tiles = [box('a', 200), box('b', 100), box('c', 50), box('d', 100)];
    expect(splitIntoColumns(tiles, 2)).toEqual([
      [box('a', 200)],
      [box('b', 100), box('c', 50), box('d', 100)],
    ]);
  });

  it('compares heights relative to width', () => {
    const tiles = [
      { id: 'wide', width: 400, height: 200 },
      { id: 'tall', width: 100, height: 100 },
      { id: 'next', width: 100, height: 100 },
    ];
    expect(splitIntoColumns(tiles, 2).map((c) => c.map((t) => t.id))).toEqual([
      ['wide', 'next'],
      ['tall'],
    ]);
  });

  it('returns empty columns when there are fewer tiles than columns', () => {
    expect(splitIntoColumns([box('a', 100)], 3)).toEqual([
      [box('a', 100)],
      [],
      [],
    ]);
  });
});
