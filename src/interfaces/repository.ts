import { FilterCondition } from '../expression/filter'
import { MetadataColumn } from './metadata'
import { RangeOption } from './range'

export interface RepositoryOptions<Entity> {
  target: any
  tableName: string
  columns: MetadataColumn[]
  hashKey: {
    property: string | symbol,
    sourceKey: string,
  }
  rangeKey?: {
    property: string | symbol,
    sourceKey: string,
  }
  indexes: {
    name: string,
    hashKey: {
      property?: string | symbol,
      sourceKey?: string,
      generated?: {
        key: string,
        properties: string[],
        sourceKeys: string[],
      },
    },
    rangeKey?: {
      property?: string | symbol,
      sourceKey?: string,
      generated?: {
        key: string,
        properties: string[],
        sourceKeys: string[],
      },
    },
  }[]
  generatedValues: {
    property: string | symbol,
    sourceKey: string,
    strategy: string,
  }[]
}

export interface CountOptions {
  indexName?: string
  hash: string | number
}

export interface RetrieveOptions<P> {
  indexName?: string
  hash: string | number
  rangeOption?: RangeOption
  filter?: FilterCondition
  select?: (keyof P)[]
  limit?: number
  after?: string
  desc?: boolean
}

export interface RetrieveResult<P> {
  nodes: P[]
  endCursor?: string
}

export interface ScanRetrieveOptions<P> {
  filter?: FilterCondition
  select?: (keyof P)[]
  limit?: number
  after?: string
}

export interface CreateOptions {
  condition?: FilterCondition
}

export interface RemoveOptions {
  condition?: FilterCondition
}

export interface PersistOptions {
  remove?: string[]
  condition?: FilterCondition
}
