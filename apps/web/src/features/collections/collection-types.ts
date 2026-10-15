export type Collection = {
  id: string;
  name: string;
  parentId: string | null;
  /** Counted from the sources on each read, so it never goes out of sync. */
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCollectionInput = {
  name?: string;
  parentId?: string;
};

export type UpdateCollectionInput = Partial<Pick<Collection, 'name'>>;
