import { GeneratedValueDecoratorFactory } from "../interfaces/decorator"
import { metadataGeneratedValues } from "../metadata"


export const GeneratedValue: GeneratedValueDecoratorFactory = (options = {}) => (target, property) => {
  let values = metadataGeneratedValues.get(target.constructor)
  if (!values) {
    values = []
    metadataGeneratedValues.set(target.constructor, values)
  }
  values.push({
    target,
    property,
    strategy: options.strategy || "uuid",
  })
}
