
export interface QueryOptions<P> {
  indexName?: string
  hash: string | number
  range?: string | number
  limit?: number
  after?: DynamoCursor
  desc?: boolean
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
  hashKey: string | number
  rangeKey?: string | number
}
