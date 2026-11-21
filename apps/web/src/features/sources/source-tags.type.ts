/** `group` is null for a tag the user has not put in a group. */
export type SourceTagParts = { group: string | null; name: string };

export type SourceTagCount = { tag: string; count: number };

export type SourceTagGroup = { group: string | null; counts: SourceTagCount[] };

export type SourceTagRename = { from: string; to: string };

export type SourceTagChange =
  | { kind: 'move'; tag: string; group: string | null }
  | { kind: 'rename-group'; from: string; to: string };
