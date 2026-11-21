import { describe, expect, it } from 'vitest';

import {
  countTags,
  filterSourcesByTags,
  formatTag,
  groupTagCounts,
  normalizeTag,
  normalizeTagGroup,
  parseTag,
  parseTagList,
  planTagRenames,
  searchTags,
} from './source-tags';
import type { Source } from './source-types';

function withTags(id: string, tags: string[]): Source {
  return { id, tags } as Source;
}

describe('normalizeTag', () => {
  it('lowercases, trims and squeezes spaces', () => {
    expect(normalizeTag('  Hand   Made ')).toBe('hand made');
  });

  it('keeps any group and cleans both sides', () => {
    expect(normalizeTag('Style: Minimal')).toBe('style:minimal');
    expect(normalizeTag('my mood:calm')).toBe('my mood:calm');
  });

  it('rejects two colons, an empty side and a bad character', () => {
    expect(normalizeTag('a:b:c')).toBeNull();
    expect(normalizeTag('style:')).toBeNull();
    expect(normalizeTag(':calm')).toBeNull();
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

describe('normalizeTagGroup', () => {
  it('cleans a group name and refuses a colon', () => {
    expect(normalizeTagGroup(' Style ')).toBe('style');
    expect(normalizeTagGroup('a:b')).toBeNull();
    expect(normalizeTagGroup('')).toBeNull();
  });
});

describe('parseTag', () => {
  it('splits a grouped tag and leaves a plain tag whole', () => {
    expect(parseTag('mood:calm')).toEqual({ group: 'mood', name: 'calm' });
    expect(parseTag('handmade')).toEqual({ group: null, name: 'handmade' });
  });
});

describe('formatTag', () => {
  it('shows the group with a dash, or hides it', () => {
    expect(formatTag('style:minimal', true)).toBe('style-minimal');
    expect(formatTag('style:minimal', false)).toBe('minimal');
    expect(formatTag('handmade', true)).toBe('handmade');
  });
});

describe('searchTags', () => {
  const counts = [
    { tag: 'style:minimal', count: 5 },
    { tag: 'maximal', count: 4 },
    { tag: 'minimalism', count: 1 },
    { tag: 'calm', count: 3 },
  ];

  it('finds nothing until the user types', () => {
    expect(searchTags(counts, '  ')).toEqual([]);
  });

  it('puts names that start with the text first, then the rest', () => {
    expect(searchTags(counts, 'mal').map(({ tag }) => tag)).toEqual([
      'style:minimal',
      'maximal',
      'minimalism',
    ]);
    expect(searchTags(counts, 'min').map(({ tag }) => tag)).toEqual([
      'style:minimal',
      'minimalism',
    ]);
  });

  it('shows at most six', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      tag: `tag${i}`,
      count: 1,
    }));

    expect(searchTags(many, 'tag')).toHaveLength(6);
  });
});

describe('groupTagCounts', () => {
  it('lists groups A to Z, then tags with no group', () => {
    const groups = groupTagCounts([
      { tag: 'plain', count: 3 },
      { tag: 'style:a', count: 2 },
      { tag: 'mood:b', count: 1 },
    ]);

    expect(groups.map(({ group }) => group)).toEqual(['mood', 'style', null]);
  });
});

describe('planTagRenames', () => {
  const tags = ['minimal', 'style:bold', 'style:retro', 'calm'];

  it('moves a tag into a group, out of it, and does nothing when it stays', () => {
    expect(
      planTagRenames(tags, { kind: 'move', tag: 'minimal', group: 'style' }),
    ).toEqual([{ from: 'minimal', to: 'style:minimal' }]);
    expect(
      planTagRenames(tags, { kind: 'move', tag: 'style:bold', group: null }),
    ).toEqual([{ from: 'style:bold', to: 'bold' }]);
    expect(
      planTagRenames(tags, { kind: 'move', tag: 'style:bold', group: 'style' }),
    ).toEqual([]);
  });

  it('renames every tag of a group', () => {
    expect(
      planTagRenames(tags, { kind: 'rename-group', from: 'style', to: 'look' }),
    ).toEqual([
      { from: 'style:bold', to: 'look:bold' },
      { from: 'style:retro', to: 'look:retro' },
    ]);
  });

  it('throws when the new tag would be too long', () => {
    expect(() =>
      planTagRenames(tags, {
        kind: 'move',
        tag: 'minimal',
        group: 'g'.repeat(35),
      }),
    ).toThrow();
  });
});

describe('parseTagList', () => {
  it('reads a comma list, drops bad tags and repeats', () => {
    expect(parseTagList('style:minimal, ,Style:Minimal,a:b:c,warm')).toEqual([
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
