import { Identifier, RelaterOptions } from "relater"

export interface RepositoryOptions<P> extends RelaterOptions<P> {
  name: string
  id: {
    property: Identifier
    sourceKey: string
  }
  generatedValues: {
    property: Identifier
    strategy: string
  }[]
}

export interface RetrieveOptions {
  limit?: number
  // offset?: number
  after?: string
}

export interface RetrieveResult<P> {
  nodes: {
    cursor: string
    node: P
  }[]
  endCursor?: string
}

