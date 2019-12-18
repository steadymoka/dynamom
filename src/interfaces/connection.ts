import { Key } from "aws-sdk/clients/dynamodb"
import { RagneOption } from "./range"

export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  rangeOption?: RagneOption
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
  hash: string | number
  range?: string | number
}
