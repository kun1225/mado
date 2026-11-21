import type { SOURCE_FACETS } from './source-tags';

export type SourceFacet = (typeof SOURCE_FACETS)[number];

export type SourceTagParts = { facet: SourceFacet | null; value: string };

export type SourceTagCount = { tag: string; count: number };

export type SourceTagGroup = { label: string; counts: SourceTagCount[] };
