import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { RagneOption } from './range'

export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  rangeOption?: RagneOption
  limit?: number
  after?: Record<string, AttributeValue>
  desc?: boolean
}

export interface QueryResult<P> {
  nodes: P[]
  endCursor?: Record<string, AttributeValue>
}

export interface DynamoNode<P> {
  cursor: DynamoCursor
  node: P
}

export interface DynamoCursor {
  hash: string | number
  range?: string | number
}
