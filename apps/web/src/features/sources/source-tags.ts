import type {
  SourceTagChange,
  SourceTagCount,
  SourceTagGroup,
  SourceTagParts,
  SourceTagRename,
} from './source-tags.type';
import type { Source } from './source-types';

export const MAX_TAG_LENGTH = 40;

const MAX_SEARCH_RESULTS = 6;

const TAG_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;

/** A clean tag (`style:minimal` or `handmade`), or null when it breaks the rules. */
export function normalizeTag(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (text.length === 0 || text.length > MAX_TAG_LENGTH) return null;

  const parts = text.split(':').map((part) => part.trim());
  if (parts.length > 2 || !parts.every(isTagName)) return null;
  return parts.join(':');
}

/** A group name follows the tag rules but holds no colon. */
export function normalizeTagGroup(raw: string): string | null {
  const group = normalizeTag(raw);
  return group && !group.includes(':') ? group : null;
}

/** `style:minimal` is the name `minimal` in the user's group `style`. */
export function parseTag(tag: string): SourceTagParts {
  const colon = tag.indexOf(':');

  return colon === -1
    ? { group: null, name: tag }
    : { group: tag.slice(0, colon), name: tag.slice(colon + 1) };
}

/** A dash, not the stored colon, because people read `style-minimal` as one word. */
export function formatTag(tag: string, showGroup: boolean): string {
  const { group, name } = parseTag(tag);
  return group && showGroup ? `${group}-${name}` : name;
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

/** Tags the user already has, so the library keeps one word for one idea. Empty until they type. */
export function searchTags(
  counts: SourceTagCount[],
  query: string,
): SourceTagCount[] {
  const text = query.trim().toLowerCase();
  if (text === '') return [];

  const startsWith = ({ tag }: SourceTagCount) =>
    parseTag(tag).name.startsWith(text) || tag.startsWith(text);
  const matches = counts.filter(({ tag }) => tag.includes(text));

  return [
    ...matches.filter(startsWith),
    ...matches.filter((count) => !startsWith(count)),
  ].slice(0, MAX_SEARCH_RESULTS);
}

/** The user's groups A to Z, then the tags with no group. Counts keep their order inside a group. */
export function groupTagCounts(counts: SourceTagCount[]): SourceTagGroup[] {
  const groups = [...new Set(counts.map(({ tag }) => parseTag(tag).group))];
  const named = groups
    .filter((group) => group !== null)
    .sort((a, b) => a.localeCompare(b));
  const order = groups.includes(null) ? [...named, null] : named;

  return order.map((group) => ({
    group,
    counts: counts.filter(({ tag }) => parseTag(tag).group === group),
  }));
}

/** Turns a move or a group rename into tag renames. Empty when nothing would change. */
export function planTagRenames(
  tags: string[],
  change: SourceTagChange,
): SourceTagRename[] {
  const renames =
    change.kind === 'move'
      ? [{ from: change.tag, to: joinTag(change.group, change.tag) }]
      : tags
          .filter((tag) => parseTag(tag).group === change.from)
          .map((tag) => ({ from: tag, to: joinTag(change.to, tag) }));

  return renames.filter(({ from, to }) => from !== to);
}

// *** isTagName ***
function isTagName(text: string): boolean {
  return TAG_NAME_PATTERN.test(text);
}

// *** joinTag ***
function joinTag(group: string | null, tag: string): string {
  const { name } = parseTag(tag);
  const joined = group ? normalizeTag(`${group}:${name}`) : name;
  // The group name is checked before this, so only the length can fail.
  if (joined === null) {
    throw new Error(
      `"${group}:${name}" is longer than ${MAX_TAG_LENGTH} characters.`,
    );
  }
  return joined;
}
