import { describe, expect, it } from 'vitest';

import type { Source } from '../source-types';

import { resolveSourceDetail } from './use-source-detail';

const sources = ['a', 'b', 'c'].map((id) => ({ id }) as Source);

describe('resolveSourceDetail', () => {
  it('returns the source and both neighbours', () => {
    const view = resolveSourceDetail(sources, 'b');

    expect(view.index).toBe(1);
    expect(view.previous?.id).toBe('a');
    expect(view.next?.id).toBe('c');
  });

  it('has no neighbour past either end', () => {
    expect(resolveSourceDetail(sources, 'a').previous).toBeUndefined();
    expect(resolveSourceDetail(sources, 'c').next).toBeUndefined();
  });

  it('returns nothing for a missing or null id', () => {
    expect(resolveSourceDetail(sources, 'zzz').source).toBeUndefined();
    expect(resolveSourceDetail(sources, null).index).toBe(-1);
  });
});
