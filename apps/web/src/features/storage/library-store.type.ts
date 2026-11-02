import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

/**
 * Where records live. The web app keeps them in IndexedDB, and the desktop app
 * keeps them as files in the library folder.
 */
export type LibraryStore = {
  listCollections: () => Promise<Collection[]>;
  getCollection: (id: string) => Promise<Collection | undefined>;
  putCollections: (collections: Collection[]) => Promise<void>;
  deleteCollections: (ids: string[]) => Promise<void>;

  /** Includes the trash. */
  listSources: () => Promise<Source[]>;
  getSource: (id: string) => Promise<Source | undefined>;
  listSourcesInCollection: (collectionId: string) => Promise<Source[]>;
  /** Fails when the id already exists, which import relies on. */
  addSource: (source: Source) => Promise<void>;
  putSources: (sources: Source[]) => Promise<void>;
  deleteSources: (ids: string[]) => Promise<void>;
};
