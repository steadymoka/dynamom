import { AttributeValue, AttributeMap } from "aws-sdk/clients/dynamodb"

export function fromDynamoAttributeMap(item: AttributeMap): {[key: string]: any} {
  return Object.keys(item).reduce((carry, key) => Object.assign(carry, {
    [key]: fromDynamoAttribute(item[key]),
  }), {})
}

export function fromDynamoAttribute(item: AttributeValue): any {
  if (item.NULL) {
    return null
  }
  if (item.S) {
    return item.S
  }
  if (item.N) {
    return +item.N
  }
  if (typeof item.BOOL !== "undefined") {
    return item.BOOL
  }
  if (item.L) {
    return item.L.map(fromDynamoAttribute)
  }
  if (item.M) {
    const m = item.M
    return Object.keys(m).reduce((carry, key) => Object.assign(carry, {
      [key]: fromDynamoAttribute(m[key]),
    }), {})
  }
  return {}
}
