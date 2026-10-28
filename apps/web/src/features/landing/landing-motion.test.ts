import { describe, expect, it } from 'vitest';

import { pickActiveStep, stepProgress, tilePose } from './landing-motion';

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
