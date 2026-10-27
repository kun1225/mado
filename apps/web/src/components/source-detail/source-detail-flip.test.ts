import { describe, expect, it } from 'vitest';

import { containBox, flipFrame } from './source-detail-flip';

const media = { left: 100, top: 50, width: 800, height: 600 };

describe('flipFrame', () => {
  it('scales uniformly to cover a wide tile and clips its height', () => {
    const frame = flipFrame({
      tile: { left: 0, top: 0, width: 400, height: 100 },
      media,
      content: { left: 100, top: 125, width: 800, height: 450 },
      tileRadius: 12,
    });

    // 400/800 beats 100/450, so the width decides and the picture keeps its ratio.
    expect(frame.transform).toBe('translate(-300px, -300px) scale(0.5)');
    expect(frame.transformOrigin).toBe('400px 300px');
    expect(frame.clipPath).toBe('inset(200px 0px 200px 0px round 24px)');
  });

  it('keeps the top of the element when anchored to the top', () => {
    // A text sheet: the card shows its first line, so the flight must too.
    const sheet = { left: 100, top: 50, width: 800, height: 1000 };
    const frame = flipFrame({
      tile: { left: 0, top: 0, width: 400, height: 100 },
      media: sheet,
      content: sheet,
      tileRadius: 0,
      anchor: 'top',
    });

    // Scale 0.5, so the card shows 200px of the sheet, cut from its top edge.
    expect(frame.transformOrigin).toBe('400px 100px');
    expect(frame.transform).toBe('translate(-300px, -100px) scale(0.5)');
    expect(frame.clipPath).toBe('inset(0px 0px 800px 0px round 0px)');
  });

  it('clips the width when the tile is taller than the picture', () => {
    const frame = flipFrame({
      tile: { left: 0, top: 0, width: 90, height: 90 },
      media,
      content: { left: 100, top: 125, width: 800, height: 450 },
      tileRadius: 12,
    });

    // 90/450 beats 90/800: a 450×450 square cut from the picture's centre.
    expect(frame.transform).toBe('translate(-455px, -305px) scale(0.2)');
    expect(frame.clipPath).toBe('inset(75px 175px 75px 175px round 60px)');
  });

  it('centres on a letterboxed picture that sits off-centre in its element', () => {
    const frame = flipFrame({
      tile: { left: 0, top: 0, width: 400, height: 100 },
      media,
      content: { left: 100, top: 50, width: 800, height: 450 },
      tileRadius: 0,
    });

    expect(frame.transformOrigin).toBe('400px 225px');
    expect(frame.clipPath).toBe('inset(125px 0px 275px 0px round 0px)');
  });
});

describe('containBox', () => {
  it('letterboxes a wide picture inside a tall box', () => {
    expect(containBox(media, 16 / 9)).toEqual({
      left: 100,
      top: 125,
      width: 800,
      height: 450,
    });
  });

  it('pillarboxes a tall picture inside a wide box', () => {
    expect(containBox(media, 1 / 2)).toEqual({
      left: 350,
      top: 50,
      width: 300,
      height: 600,
    });
  });
});
