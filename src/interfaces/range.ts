export interface RangeOption {
  range: string | number | boolean
  getExpression(): string
  getExtraValues?(): Record<string, string | number | boolean>
}

/** @deprecated Use `RangeOption` instead. Kept for backward compatibility. */
export type RagneOption = RangeOption

export class DefaultRange implements RangeOption {

  public constructor(public range: string | number | boolean) { }

  public getExpression(): string {
    return '#rangekey = :rangekey'
  }
}

export class BiggerThanRange implements RangeOption {

  public constructor(public range: number) { }

  public getExpression(): string {
    return '#rangekey > :rangekey'
  }
}

export class SmallerThanRange implements RangeOption {

  public constructor(public range: number) { }

  public getExpression(): string {
    return '#rangekey < :rangekey'
  }
}

export class GteRange implements RangeOption {

  public constructor(public range: number) { }

  public getExpression(): string {
    return '#rangekey >= :rangekey'
  }
}

export class LteRange implements RangeOption {

  public constructor(public range: number) { }

  public getExpression(): string {
    return '#rangekey <= :rangekey'
  }
}

export class BeginsWithRange implements RangeOption {

  public constructor(public range: string) { }

  public getExpression(): string {
    return 'begins_with(#rangekey, :rangekey)'
  }
}

export class BetweenRange implements RangeOption {

  public range: string | number

  public constructor(public low: string | number, public high: string | number) {
    this.range = low
  }

  public getExpression(): string {
    return '#rangekey BETWEEN :rangekey AND :rangekey_high'
  }

  public getExtraValues(): Record<string, string | number> {
    return { ':rangekey_high': this.high }
  }
}
