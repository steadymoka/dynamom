
export type Indexer<P> = (entity: P) => string

export class Condition {
  public BiggerThan: string = "BiggerThan"
  public SmallerThan: string = "SmallerThan"
}

