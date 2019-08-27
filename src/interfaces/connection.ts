import { Key } from "aws-sdk/clients/dynamodb"

export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  range?: string | number
  limit?: number
  after?: Key
  desc?: boolean
}

export interface QueryResult<P> {
  nodes: P[]
  endCursor?: Key
}

export interface DynamoNode<P extends {}> {
  cursor: DynamoCursor
  node: P
}

export interface DynamoCursor {
  hashKey: string | number
  rangeKey?: string | number
}
