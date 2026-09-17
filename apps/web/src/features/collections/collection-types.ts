export type Collection = {
  id: string;
  name: string;
  /** Derived from the sources on read, so it can never drift. */
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCollectionInput = {
  name?: string;
};

export type UpdateCollectionInput = Partial<Pick<Collection, 'name'>>;
