import { IndexDecoratorFactory } from '../interfaces/decorator'
import { MetadataStorage } from '../metadata/storage'

export const Index: IndexDecoratorFactory = (options) => (target) => {
  const metadataIndexes = MetadataStorage.getGlobalStorage().indexes
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
