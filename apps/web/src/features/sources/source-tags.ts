import type {
  SourceFacet,
  SourceTagCount,
  SourceTagParts,
} from './source-tags.type';
import type { Source } from './source-types';

/** Fixed brand facets. AI fills the same ones, so it can compare sources. */
export const SOURCE_FACETS = [
  'emotion',
  'style',
  'color',
  'type',
  'industry',
] as const;

export const MAX_TAG_LENGTH = 40;

const TAG_VALUE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;

/** A clean tag (`style:minimal` or `handmade`), or null when it breaks the rules. */
export function normalizeTag(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (text.length === 0 || text.length > MAX_TAG_LENGTH) return null;

  const colon = text.indexOf(':');
  if (colon === -1) return TAG_VALUE_PATTERN.test(text) ? text : null;

  const facet = text.slice(0, colon).trim();
  const value = text.slice(colon + 1).trim();
  return isFacet(facet) && TAG_VALUE_PATTERN.test(value)
    ? `${facet}:${value}`
    : null;
}

export function parseTag(tag: string): SourceTagParts {
  const colon = tag.indexOf(':');
  const facet = tag.slice(0, colon);

  return colon !== -1 && isFacet(facet)
    ? { facet, value: tag.slice(colon + 1) }
    : { facet: null, value: tag };
}

/** Reads the `tags` URL value. Bad tags are dropped, because a URL can be typed by hand. */
export function parseTagList(value: unknown): string[] {
  // The router turns a value like `?tags=2026` into a number.
  if (typeof value !== 'string' && typeof value !== 'number') return [];

  const tags = String(value)
    .split(',')
    .map(normalizeTag)
    .filter((tag) => tag !== null);
  return [...new Set(tags)];
}

/**
 * AND: designers narrow a board down, so every picked tag must match.
 * `keepId` is the source open in the detail dialog. Removing its tag must not close the dialog mid-edit.
 */
export function filterSourcesByTags(
  sources: Source[],
  selected: string[],
  keepId: string | null = null,
): Source[] {
  if (selected.length === 0) return sources;
  return sources.filter(
    (source) =>
      source.id === keepId ||
      selected.every((tag) => source.tags.includes(tag)),
  );
}

export function countTags(sources: Source[]): SourceTagCount[] {
  const counts = new Map<string, number>();

  for (const source of sources) {
    for (const tag of new Set(source.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Offered while typing. Users can add any other value. */
export const SOURCE_FACET_STARTERS: Record<SourceFacet, string[]> = {
  emotion: [
    'calm',
    'playful',
    'bold',
    'warm',
    'serious',
    'nostalgic',
    'luxurious',
    'friendly',
  ],
  style: [
    'minimal',
    'editorial',
    'retro',
    'brutalist',
    'organic',
    'geometric',
    'handmade',
    'futuristic',
  ],
  color: [
    'warm',
    'cool',
    'muted',
    'vibrant',
    'pastel',
    'monochrome',
    'dark',
    'earthy',
  ],
  type: ['serif', 'sans', 'script', 'display', 'mono', 'handwritten'],
  industry: [
    'food',
    'fashion',
    'tech',
    'beauty',
    'finance',
    'health',
    'culture',
    'hospitality',
  ],
};

// *** isFacet ***
function isFacet(value: string): value is SourceFacet {
  return (SOURCE_FACETS as readonly string[]).includes(value);
}
