
export interface RagneOption {
  range: string | number | boolean
  getExpression(): string
}

export class DefaultRange implements RagneOption {
  
  public constructor(public range: string | number | boolean) { }

  public getExpression(): string {
    return `#rangekey = :rangekey`
  }
}

export class BiggerThanRange implements RagneOption {
  
  public constructor(public range: number) { }

  public getExpression(): string {
    return `#rangekey > :rangekey`
  }
}

export class SmallerThanRange implements RagneOption {
  
  public constructor(public range: number) { }

  public getExpression(): string {
    return `#rangekey < :rangekey`
  }
}
