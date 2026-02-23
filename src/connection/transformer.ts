import type { AttributeValue } from '@aws-sdk/client-dynamodb'

export function toDynamoMap(item: Record<string, any>): Record<string, AttributeValue> {
  return Object.entries(item).reduce((carry, [key, value]) => Object.assign(carry, {
    [key]: toDynamo(value),
  }), {})
}

export function toDynamo(item: any): AttributeValue {
  if (item === null || typeof item === 'undefined') {
    return { NULL: true }
  }
  if (item instanceof Buffer) {
    return { B: item }
  }
  switch (typeof item) {
    case 'string':
      return { S: item }
    case 'number':
      return { N: `${item}` }
    case 'boolean':
      return { BOOL: item }
  }
  if (item instanceof Set) {
    if (item.size === 0) return { NULL: true }
    const arr = [...item]
    if (typeof arr[0] === 'string') return { SS: arr as string[] }
    if (typeof arr[0] === 'number') return { NS: (arr as number[]).map(String) }
  }
  if (Array.isArray(item)) {
    return { L: item.map(toDynamo) }
  }
  return { M: toDynamoMap(item) }
}


export function fromDynamoMap(item: Record<string, AttributeValue>): Record<string, any> {
  return Object.entries(item).reduce((carry, [key, value]) => Object.assign(carry, {
    [key]: fromDynamo(value),
  }), {})
}

export function fromDynamo(item: AttributeValue): any {
  if (item.NULL) {
    return null
  }
  if (item.B) {
    return item.B
  }
  if ('S' in item) {
    return item.S
  }
  if (item.N) {
    return +item.N
  }
  if ('BOOL' in item) {
    return item.BOOL
  }
  if (item.L) {
    return item.L.map(fromDynamo)
  }
  if (item.SS) {
    return new Set(item.SS)
  }
  if (item.NS) {
    return new Set(item.NS.map(Number))
  }
  if (item.M) {
    return fromDynamoMap(item.M)
  }
  throw new TypeError(`Unknown Dynamo attribute value. (item=${JSON.stringify(item)})`)
}
