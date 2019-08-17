import { IndexDecoratorFactory } from "../interfaces/decorator"
import { metadataIndexes } from "../metadata"


export const Index: IndexDecoratorFactory = (options = {}) => (target, property) => {
  let indexes = metadataIndexes.get(target.constructor)
  if (!indexes) {
    indexes = []
    metadataIndexes.set(target.constructor, indexes)
  }
  indexes.push({
    target,
    property,
    name: options.name || `index__${String(property)}`,
    rangeKey: options.rangeKey
  })
}
