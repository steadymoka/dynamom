import { DeepPartial } from "relater"

export interface ConnectionOptions {
  table: string
  hashKey?: string
  rangeKey?: string
}

export interface QueryOptions<P> {
  limit?: number
  after?: DynamoCursor
  desc?: boolean
  index?: string | number | boolean
  filter?: DeepPartial<P>
}

export interface QueryResult<P> {
  nodes: DynamoNode<P>[]
  endCursor?: DynamoCursor
}

export interface DynamoNode<P extends {}> {
  cursor: DynamoCursor
  node: P
}

export interface DynamoCursor {
  hashKey: string
  rangeKey: string
}
