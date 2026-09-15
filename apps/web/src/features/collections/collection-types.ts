export type Collection = {
  id: string
  name: string
  saveCount: number
  createdAt: string
  updatedAt: string
}

export type CreateCollectionInput = {
  name?: string
}

export type UpdateCollectionInput = Partial<Pick<Collection, 'name'>>
