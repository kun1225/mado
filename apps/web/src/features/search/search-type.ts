import type Fuse from 'fuse.js';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

export type SearchIndex = {
  collections: Fuse<Collection>;
  sources: Fuse<Source>;
  /** Its own index, because names match loosely and these must match exactly. */
  sourceTexts: Fuse<Source>;
};

export type SearchResults = {
  collections: Collection[];
  sources: Source[];
};
