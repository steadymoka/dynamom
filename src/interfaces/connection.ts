import { Key } from "aws-sdk/clients/dynamodb"
import { Condition } from "./common"

export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  range?: string | number
  condition?: keyof Condition
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
