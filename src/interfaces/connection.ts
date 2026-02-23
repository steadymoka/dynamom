import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { FilterCondition } from '../expression/filter'
import { RangeOption } from './range'

export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  rangeOption?: RangeOption
  filter?: FilterCondition
  projection?: string[]
  limit?: number
  after?: Record<string, AttributeValue>
  desc?: boolean
}

export interface QueryResult<P> {
  nodes: P[]
  endCursor?: Record<string, AttributeValue>
}

export interface ScanOptions<P> {
  filter?: FilterCondition
  projection?: string[]
  limit?: number
  after?: Record<string, AttributeValue>
}

export interface ScanResult<P> {
  nodes: P[]
  endCursor?: Record<string, AttributeValue>
}

export interface UpdateItemOptions {
  remove?: string[]
  add?: Record<string, number | Set<string> | Set<number>>
  deleteFromSet?: Record<string, Set<string> | Set<number>>
  appendToList?: Record<string, { values: any[], prepend?: boolean }>
  setIfNotExists?: Record<string, any>
  condition?: FilterCondition
}

export interface DynamoNode<P> {
  cursor: DynamoCursor
  node: P
}

export interface DynamoCursor {
  hash: string | number
  range?: string | number
}
