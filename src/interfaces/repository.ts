import { Identifier, RelaterOptions, DeepPartial } from "relater"

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

export interface RetrieveOptions<P> {
  limit?: number
  after?: string
  index?: {name: string, filter?: string | number | boolean}
  desc?: boolean
  filter?: DeepPartial<P>
}

export interface RetrieveResult<P> {
  nodes: {
    cursor: string
    node: P
  }[]
  endCursor?: string
}
