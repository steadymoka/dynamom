import { IndexDecoratorFactory } from "../interfaces/decorator"
import { metadataIndexes } from "../metadata"


export const Index: IndexDecoratorFactory = (name, options = { rangeKeys: [] }) => (target, property) => {
  let indexes = metadataIndexes.get(target.constructor)
  if (!indexes) {
    indexes = []
    metadataIndexes.set(target.constructor, indexes)
  }
  indexes.push({
    target,
    property,
    name: name || `index__${String(property)}`,
    rangeKeys: options.rangeKeys,
  })
}
