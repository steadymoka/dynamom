import { GeneratedValueDecoratorFactory } from '../interfaces/decorator'
import { MetadataStorage } from '../metadata/storage'


export const GeneratedValue: GeneratedValueDecoratorFactory = (options = {}) => (target, property) => {
  const metadataGeneratedValues = MetadataStorage.getGlobalStorage().generatedValues
  let values = metadataGeneratedValues.get(target.constructor)
  if (!values) {
    values = []
    metadataGeneratedValues.set(target.constructor, values)
  }
  values.push({
    target,
    property,
    strategy: options.strategy || 'uuid',
  })
}
