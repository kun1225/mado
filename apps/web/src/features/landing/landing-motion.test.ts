import { describe, expect, it } from 'vitest';

import {
  demoSlice,
  introClusterFloat,
  mixFloat,
  phaseProgress,
  pickActiveSection,
  pickActiveStep,
  searchFrame,
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

describe('pickActiveSection', () => {
  const sections = [
    { id: 'features', top: 100, bottom: 500 },
    { id: 'faq', top: 800, bottom: 1200 },
  ];

  it('picks the section that crosses the line', () => {
    expect(pickActiveSection(sections, 300)).toBe('features');
    expect(pickActiveSection(sections, 900)).toBe('faq');
  });

  it('counts the top edge in and the bottom edge out', () => {
    expect(pickActiveSection(sections, 100)).toBe('features');
    expect(pickActiveSection(sections, 500)).toBeNull();
  });

  it('returns null between and outside the sections', () => {
    expect(pickActiveSection(sections, 50)).toBeNull();
    expect(pickActiveSection(sections, 650)).toBeNull();
    expect(pickActiveSection([], 300)).toBeNull();
  });
});

describe('searchFrame', () => {
  const lengths = [10, 4, 20];

  it('types the query of the current third, then holds it', () => {
    expect(searchFrame(0, lengths)).toEqual({ index: 0, length: 0 });
    expect(searchFrame(0.5 / 3, lengths)).toEqual({ index: 0, length: 10 });
    expect(searchFrame(0.99 / 3, lengths)).toEqual({ index: 0, length: 10 });
  });

  it('moves to the next query and starts typing it from empty', () => {
    expect(searchFrame(1 / 3 + 0.001, lengths)).toEqual({
      index: 1,
      length: 0,
    });
    expect(searchFrame(1, lengths)).toEqual({ index: 2, length: 20 });
  });
});

describe('introClusterFloat', () => {
  const stage = { width: 1000, height: 800 };

  it('overlaps cards in a compact cluster with varied heights and angles', () => {
    const poses = Array.from({ length: 20 }, (_, rank) =>
      introClusterFloat(rank, 20, stage, 200),
    );
    expect(new Set(poses.map((pose) => pose.y)).size).toBeGreaterThan(10);
    expect(new Set(poses.map((pose) => pose.rotate)).size).toBeGreaterThan(10);
    for (const pose of poses) {
      expect(Math.abs(pose.x - 0.5) * stage.width).toBeLessThanOrEqual(135);
      expect(Math.abs(pose.y - 0.5) * stage.height).toBeLessThanOrEqual(92);
    }
  });

  it('scales every tile to the same width', () => {
    const narrow = introClusterFloat(0, 3, stage, 100);
    const wide = introClusterFloat(0, 3, stage, 200);
    expect(narrow.scale * 100).toBeCloseTo(wide.scale * 200);
  });
});

describe('mixFloat', () => {
  const from = { x: 0, y: 0.5, scale: 0.2, rotate: 0 };
  const to = { x: 1, y: 0.1, scale: 0.6, rotate: -8 };

  it('returns each end at 0 and 1, and the middle halfway', () => {
    expect(mixFloat(from, to, 0)).toEqual(from);
    expect(mixFloat(from, to, 1)).toEqual(to);
    const half = mixFloat(from, to, 0.5);
    expect(half.x).toBeCloseTo(0.5);
    expect(half.y).toBeCloseTo(0.3);
    expect(half.scale).toBeCloseTo(0.4);
    expect(half.rotate).toBeCloseTo(-4);
  });
});

describe('demoSlice', () => {
  it('gives each item its own overlapping part of a step', () => {
    expect(demoSlice(0)).toEqual([0.05, 0.3]);
    const [start, end] = demoSlice(1);
    expect(start).toBeCloseTo(0.2);
    expect(end).toBeCloseTo(0.45);
  });

  it('ends the fourth item before the step ends, so the finished demo holds', () => {
    expect(demoSlice(3)[1]).toBeLessThan(1);
  });
});
