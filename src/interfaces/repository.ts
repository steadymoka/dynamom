import { Identifier, RelaterOptions, DeepPartial } from "relater"

export interface RepositoryOptions<P> extends RelaterOptions<P> {
  tableName: string
  hashKey: {
    property: Identifier
    sourceKey: string
  }
  rangeKey: {
    property: Identifier
    sourceKey: string
  }
  indexes: {
    name: string
    hashKey: string
    rangeKey?: string
  }[]
  generatedValues: {
    property: Identifier
    strategy: string
  }[]
}

export interface RetrieveOptions<P> {
  indexName?: string
  hash: string | number
  limit?: number
  after?: string
  filter?: {
    property: DeepPartial<P>
    value: any
  }
  desc?: boolean
}

export interface RetrieveResult<P> {
  nodes: {
    cursor: string
    node: P
  }[]
  endCursor?: string
}
