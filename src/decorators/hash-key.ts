import { IdDecoratorFactory } from '../interfaces/decorator'
import { MetadataStorage } from '../metadata/storage'


export const HashKey: IdDecoratorFactory = () => (target, property) => {
  const metadataHashKeys = MetadataStorage.getGlobalStorage().hashKeys
  if (metadataHashKeys.get(target)) {
    throw new Error('hash key decoartor must be only one per class')
  }
  metadataHashKeys.set(target.constructor, {
    target,
    property,
  })
}
