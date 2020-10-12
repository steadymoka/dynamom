import { IdDecoratorFactory } from '../interfaces/decorator'
import { MetadataStorage } from '../metadata/storage'


export const RangeKey: IdDecoratorFactory = () => (target, property) => {
  const metadataRangeKeys = MetadataStorage.getGlobalStorage().rangeKeys
  if (metadataRangeKeys.get(target)) {
    throw new Error('range key decoartor must be only one per class')
  }
  metadataRangeKeys.set(target.constructor, {
    target,
    property,
  })
}
