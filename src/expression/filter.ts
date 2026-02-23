import { ExpressionBuilder } from './expression-builder'

export interface FilterCondition {
  build(builder: ExpressionBuilder): string
}

// Comparison conditions

export class Eq implements FilterCondition {
  constructor(public attr: string, public value: string | number | boolean) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} = ${builder.addValue(this.value)}`
  }
}

export class Ne implements FilterCondition {
  constructor(public attr: string, public value: string | number | boolean) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} <> ${builder.addValue(this.value)}`
  }
}

export class Lt implements FilterCondition {
  constructor(public attr: string, public value: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} < ${builder.addValue(this.value)}`
  }
}

export class Lte implements FilterCondition {
  constructor(public attr: string, public value: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} <= ${builder.addValue(this.value)}`
  }
}

export class Gt implements FilterCondition {
  constructor(public attr: string, public value: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} > ${builder.addValue(this.value)}`
  }
}

export class Gte implements FilterCondition {
  constructor(public attr: string, public value: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} >= ${builder.addValue(this.value)}`
  }
}

export class Between implements FilterCondition {
  constructor(public attr: string, public low: string | number, public high: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `${builder.addName(this.attr)} BETWEEN ${builder.addValue(this.low)} AND ${builder.addValue(this.high)}`
  }
}

export class BeginsWith implements FilterCondition {
  constructor(public attr: string, public prefix: string) {}
  build(builder: ExpressionBuilder): string {
    return `begins_with(${builder.addName(this.attr)}, ${builder.addValue(this.prefix)})`
  }
}

export class Contains implements FilterCondition {
  constructor(public attr: string, public value: string | number) {}
  build(builder: ExpressionBuilder): string {
    return `contains(${builder.addName(this.attr)}, ${builder.addValue(this.value)})`
  }
}

// Existence conditions

export class AttributeExists implements FilterCondition {
  constructor(public attr: string) {}
  build(builder: ExpressionBuilder): string {
    return `attribute_exists(${builder.addName(this.attr)})`
  }
}

export class AttributeNotExists implements FilterCondition {
  constructor(public attr: string) {}
  build(builder: ExpressionBuilder): string {
    return `attribute_not_exists(${builder.addName(this.attr)})`
  }
}

// Logical combinators

export class And implements FilterCondition {
  public conditions: FilterCondition[]
  constructor(...conditions: FilterCondition[]) {
    this.conditions = conditions
  }
  build(builder: ExpressionBuilder): string {
    return `(${this.conditions.map(c => c.build(builder)).join(' AND ')})`
  }
}

export class Or implements FilterCondition {
  public conditions: FilterCondition[]
  constructor(...conditions: FilterCondition[]) {
    this.conditions = conditions
  }
  build(builder: ExpressionBuilder): string {
    return `(${this.conditions.map(c => c.build(builder)).join(' OR ')})`
  }
}

export class Not implements FilterCondition {
  constructor(public condition: FilterCondition) {}
  build(builder: ExpressionBuilder): string {
    return `NOT (${this.condition.build(builder)})`
  }
}

// Type-safe filter factory (bound to entity type)

export class FilterFactory<P> {
  constructor(private propertyToColumn: (property: string) => string) {}

  eq<K extends string & keyof P>(attr: K, value: P[K] & (string | number | boolean)): FilterCondition {
    return new Eq(this.propertyToColumn(attr), value)
  }
  ne<K extends string & keyof P>(attr: K, value: P[K] & (string | number | boolean)): FilterCondition {
    return new Ne(this.propertyToColumn(attr), value)
  }
  lt<K extends string & keyof P>(attr: K, value: P[K] & (string | number)): FilterCondition {
    return new Lt(this.propertyToColumn(attr), value)
  }
  lte<K extends string & keyof P>(attr: K, value: P[K] & (string | number)): FilterCondition {
    return new Lte(this.propertyToColumn(attr), value)
  }
  gt<K extends string & keyof P>(attr: K, value: P[K] & (string | number)): FilterCondition {
    return new Gt(this.propertyToColumn(attr), value)
  }
  gte<K extends string & keyof P>(attr: K, value: P[K] & (string | number)): FilterCondition {
    return new Gte(this.propertyToColumn(attr), value)
  }
  between<K extends string & keyof P>(attr: K, low: P[K] & (string | number), high: P[K] & (string | number)): FilterCondition {
    return new Between(this.propertyToColumn(attr), low, high)
  }
  beginsWith<K extends string & keyof P>(attr: K, prefix: string): FilterCondition {
    return new BeginsWith(this.propertyToColumn(attr), prefix)
  }
  contains<K extends string & keyof P>(attr: K, value: string | number): FilterCondition {
    return new Contains(this.propertyToColumn(attr), value)
  }
  exists(attr: string & keyof P): FilterCondition {
    return new AttributeExists(this.propertyToColumn(attr))
  }
  notExists(attr: string & keyof P): FilterCondition {
    return new AttributeNotExists(this.propertyToColumn(attr))
  }
  and(...conditions: FilterCondition[]): FilterCondition {
    return new And(...conditions)
  }
  or(...conditions: FilterCondition[]): FilterCondition {
    return new Or(...conditions)
  }
  not(condition: FilterCondition): FilterCondition {
    return new Not(condition)
  }
}

// Convenience factory namespace

export const F = {
  eq: (attr: string, value: string | number | boolean) => new Eq(attr, value),
  ne: (attr: string, value: string | number | boolean) => new Ne(attr, value),
  lt: (attr: string, value: string | number) => new Lt(attr, value),
  lte: (attr: string, value: string | number) => new Lte(attr, value),
  gt: (attr: string, value: string | number) => new Gt(attr, value),
  gte: (attr: string, value: string | number) => new Gte(attr, value),
  between: (attr: string, low: string | number, high: string | number) => new Between(attr, low, high),
  beginsWith: (attr: string, prefix: string) => new BeginsWith(attr, prefix),
  contains: (attr: string, value: string | number) => new Contains(attr, value),
  exists: (attr: string) => new AttributeExists(attr),
  notExists: (attr: string) => new AttributeNotExists(attr),
  and: (...conditions: FilterCondition[]) => new And(...conditions),
  or: (...conditions: FilterCondition[]) => new Or(...conditions),
  not: (condition: FilterCondition) => new Not(condition),
}
