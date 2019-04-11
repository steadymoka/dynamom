
export interface ConnectionOptions {
  table: string
  hashKey?: string
  rangeKey?: string
}

export interface QueryOptions {
  limit?: number
  // offset?: number
  after?: DynamoCursor
  desc?: boolean
  filter?: string | number | boolean
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
