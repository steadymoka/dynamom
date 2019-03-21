import { AttributeValue, AttributeMap } from "aws-sdk/clients/dynamodb"

export function toDynamoAttributeMap(item: {[key: string]: any}): AttributeMap {
  return Object.keys(item).reduce((carry, key) => Object.assign(carry, {
    [key]: toDynamoAttribute(item[key])
  }), {})
}

export function toDynamoAttribute(item: any): AttributeValue {
  if (item === null || item === "") {
    return {NULL: true}
  }
  if (typeof item === "string") {
    return {S: item}
  }
  if (typeof item === "number") {
    return {N: `${item}`}
  }
  if (typeof item === "boolean") {
    return {BOOL: item}
  }
  if (Array.isArray(item)) {
    return {L: item.map(toDynamoAttribute)}
  }
  return {
    M: Object.keys(item).reduce((carry, key) => Object.assign(carry, {
      [key]: toDynamoAttribute(item[key]),
    }), {})
  }
}
