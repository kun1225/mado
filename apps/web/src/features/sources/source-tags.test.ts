import { describe, expect, it } from 'vitest';

import {
  countTags,
  filterSourcesByTags,
  normalizeTag,
  parseTag,
  parseTagList,
} from './source-tags';
import type { Source } from './source-types';

function withTags(id: string, tags: string[]): Source {
  return { id, tags } as Source;
}

describe('normalizeTag', () => {
  it('lowercases, trims and squeezes spaces', () => {
    expect(normalizeTag('  Hand   Made ')).toBe('hand made');
  });

  it('keeps a known facet and cleans its value', () => {
    expect(normalizeTag('Style: Minimal')).toBe('style:minimal');
  });

  it('rejects an unknown facet, an empty value and a bad character', () => {
    expect(normalizeTag('mood:calm')).toBeNull();
    expect(normalizeTag('style:')).toBeNull();
    expect(normalizeTag('a,b')).toBeNull();
    expect(normalizeTag('   ')).toBeNull();
  });

  it('rejects a tag over 40 characters', () => {
    expect(normalizeTag('a'.repeat(40))).toBe('a'.repeat(40));
    expect(normalizeTag('a'.repeat(41))).toBeNull();
  });

  it('accepts letters from any language and hyphens', () => {
    expect(normalizeTag('手作り')).toBe('手作り');
    expect(normalizeTag('hand-made')).toBe('hand-made');
  });
});

describe('parseTag', () => {
  it('splits a facet tag and leaves a free tag whole', () => {
    expect(parseTag('emotion:calm')).toEqual({
      facet: 'emotion',
      value: 'calm',
    });
    expect(parseTag('handmade')).toEqual({ facet: null, value: 'handmade' });
  });
});

describe('parseTagList', () => {
  it('reads a comma list, drops bad tags and repeats', () => {
    expect(parseTagList('style:minimal, ,Style:Minimal,mood:x,warm')).toEqual([
      'style:minimal',
      'warm',
    ]);
    expect(parseTagList(undefined)).toEqual([]);
    expect(parseTagList(2026)).toEqual(['2026']);
  });
});

describe('filterSourcesByTags', () => {
  const sources = [
    withTags('a', ['style:minimal', 'emotion:calm']),
    withTags('b', ['style:minimal']),
    withTags('c', []),
  ];

  it('keeps every source when nothing is picked', () => {
    expect(filterSourcesByTags(sources, [])).toBe(sources);
  });

  it('keeps the open source even when it stops matching', () => {
    const ids = filterSourcesByTags(sources, ['emotion:calm'], 'c').map(
      ({ id }) => id,
    );

    expect(ids).toEqual(['a', 'c']);
  });

  it('keeps only sources that have every picked tag', () => {
    const ids = (tags: string[]) =>
      filterSourcesByTags(sources, tags).map(({ id }) => id);

    expect(ids(['style:minimal'])).toEqual(['a', 'b']);
    expect(ids(['style:minimal', 'emotion:calm'])).toEqual(['a']);
  });
});

describe('countTags', () => {
  it('counts each tag once per source, most used first, then by name', () => {
    const sources = [
      withTags('a', ['warm', 'bold']),
      withTags('b', ['warm']),
      withTags('c', ['calm']),
    ];

    expect(countTags(sources)).toEqual([
      { tag: 'warm', count: 2 },
      { tag: 'bold', count: 1 },
      { tag: 'calm', count: 1 },
    ]);
  });
});
