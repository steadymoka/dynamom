import { IndexDecoratorFactory } from "../interfaces/decorator"
import { metadataIndexes } from "../metadata"


export const Index: IndexDecoratorFactory = (name, indexer) => (target) => {
  let indexes = metadataIndexes.get(target)
  if (!indexes) {
    indexes = []
    metadataIndexes.set(target, indexes)
  }
  indexes.push({
    target,
    name,
    indexer,
  })
}
