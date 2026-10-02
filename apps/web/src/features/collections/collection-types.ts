export type Collection = {
  id: string;
  name: string;
  /** Null means a top-level collection. */
  parentId: string | null;
  /** Derived from the sources on read, so it can never drift. */
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCollectionInput = {
  name?: string;
  parentId?: string;
};

export type UpdateCollectionInput = Partial<Pick<Collection, 'name'>>;
