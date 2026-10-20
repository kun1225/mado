import { describe, expect, it } from 'vitest';

import { nextScrollHideState } from './use-hide-on-scroll';

const THRESHOLD = 120;

function scrollThrough(ys: number[]) {
  return ys.reduce((state, y) => nextScrollHideState(state, y, THRESHOLD), {
    isHidden: false,
    lastY: 0,
    downStartY: 0,
  });
}

describe('nextScrollHideState', () => {
  it('stays shown for a short scroll down', () => {
    expect(scrollThrough([40, 80, 120]).isHidden).toBe(false);
  });

  it('hides after scrolling down past the threshold', () => {
    expect(scrollThrough([60, 121]).isHidden).toBe(true);
  });

  it('shows again on any scroll up', () => {
    expect(scrollThrough([200, 190]).isHidden).toBe(false);
  });

  it('counts the threshold from where the scroll down started', () => {
    expect(scrollThrough([500, 400, 480]).isHidden).toBe(false);
    expect(scrollThrough([500, 400, 521]).isHidden).toBe(true);
  });
});
