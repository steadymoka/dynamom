import { Identifier, RelaterOptions } from "relater"

export interface RepositoryOptions<P> extends RelaterOptions<P> {
  name: string
  id: {
    property: Identifier
    sourceKey: string
  }
  indexes: {
    name: string
    indexer(entity: P): string  
  }[]
  generatedValues: {
    property: Identifier
    strategy: string
  }[]
}

export interface RetrieveOptions {
  limit?: number
  // offset?: number
  after?: string
  index?: string
  desc?: boolean
  filter?: string | number | boolean
}

export interface RetrieveResult<P> {
  nodes: {
    cursor: string
    node: P
  }[]
  endCursor?: string
}
