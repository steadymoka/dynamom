import { Identifier, RelaterOptions, DeepPartial } from "relater"

export interface RepositoryOptions<P> extends RelaterOptions<P> {
  tableName: string
  hashKey: {
    property: Identifier
    sourceKey: string
  }
  rangeKey?: {
    property: Identifier
    sourceKey: string
  }
  indexes: {
    name: string
    hashKey: {
      property?: Identifier
      sourceKey?: string
      generated?: {
        key: string
        properties: string[]
        sourceKeys: string[]
      }
    }
    rangeKey?: {
      property?: Identifier
      sourceKey?: string
      generated?: {
        key: string
        properties: string[]
        sourceKeys: string[]
      }
    }
  }[]
  generatedValues: {
    property: Identifier
    sourceKey: string
    strategy: string
  }[]
}

export interface CountOptions {
  indexName?: string
  hash: string | number
}

export interface RetrieveOptions<P> {
  indexName?: string
  hash: string | number
  range?: string | number
  limit?: number
  after?: string
  filter?: {
    property: DeepPartial<P>
    value: any
  }
  desc?: boolean
}

export interface RetrieveResult<P> {
  nodes: P[]
  endCursor?: string
}
