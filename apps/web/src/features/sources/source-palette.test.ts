import { describe, expect, it, vi } from 'vitest';

import { pickPalette } from './source-palette';

vi.mock('mediabunny', () => ({}));

function pixels(...colors: [number, number, number, number, number][]) {
  // Each entry is [r, g, b, a, how many pixels].
  return new Uint8ClampedArray(
    colors.flatMap(([r, g, b, a, count]) =>
      Array.from({ length: count }, () => [r, g, b, a]).flat(),
    ),
  );
}

describe('pickPalette', () => {
  it('returns the main colors, most used first', () => {
    const data = pixels([255, 0, 0, 255, 30], [0, 0, 255, 255, 10]);

    expect(pickPalette(data)).toEqual(['#ff0000', '#0000ff']);
  });

  it('skips see-through pixels', () => {
    const data = pixels([0, 255, 0, 0, 50], [0, 0, 0, 255, 5]);

    expect(pickPalette(data)).toEqual(['#000000']);
  });

  it('merges near colors and keeps at most five', () => {
    const data = pixels(
      [250, 250, 250, 255, 10],
      [255, 255, 255, 255, 10],
      ...[0, 60, 120, 180].map(
        (v) =>
          [v, 0, 255 - v, 255, 5] as [number, number, number, number, number],
      ),
      [0, 200, 0, 255, 5],
      [200, 200, 0, 255, 5],
    );
    const palette = pickPalette(data);

    expect(palette.length).toBeLessThanOrEqual(5);
    expect(palette.filter((hex) => hex.startsWith('#f'))).toHaveLength(1);
  });

  it('keeps exact colors and their order, with no made-up colors in between', () => {
    const data = pixels(
      [255, 0, 0, 255, 40],
      [0, 255, 0, 255, 35],
      [0, 0, 255, 255, 25],
    );

    expect(pickPalette(data)).toEqual(['#ff0000', '#00ff00', '#0000ff']);
  });

  it('drops a color under 2% of the image', () => {
    const data = pixels([255, 255, 255, 255, 99], [0, 0, 0, 255, 1]);

    expect(pickPalette(data)).toEqual(['#ffffff']);
  });

  it('returns nothing for an empty image', () => {
    expect(pickPalette(new Uint8ClampedArray())).toEqual([]);
  });
});
