import { IndexDecoratorFactory } from "../interfaces/decorator"
import { metadataIndexes } from "../metadata"

export const Index: IndexDecoratorFactory = (options) => (target) => {
  let indexes = metadataIndexes.get(target)
  if (!indexes) {
    indexes = []
    metadataIndexes.set(target, indexes)
  }
  indexes.push({
    target,
    name: options.name,
    hash: {
      keys: options.hash as [],
    },
    range: {
      keys: options.range as [],
    },
  })
}
