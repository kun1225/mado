import type Fuse from 'fuse.js';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

export type SearchIndex = {
  collections: Fuse<Collection>;
  sources: Fuse<Source>;
  /** A plain list, because names match loosely and these must match exactly. */
  sourceTexts: SearchSourceText[];
};

export type SearchSourceText = {
  source: Source;
  /** The note and the URL in lower case, ready to be searched. */
  text: string;
};

export type SearchResults = {
  collections: Collection[];
  sources: Source[];
};
