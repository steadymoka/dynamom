import { GeneratedIndexDecoratorFactory } from "../interfaces/decorator"
import { metadataGeneratedIndexes } from "../metadata"


export const GeneratedIndex: GeneratedIndexDecoratorFactory = (options = {}) => (target, property) => {
  let values = metadataGeneratedIndexes.get(target.constructor)
  if (!values) {
    values = []
    metadataGeneratedIndexes.set(target.constructor, values)
  }
  values.push({
    target,
    property,
    indexHash: options.indexHash || "all",
    targets: options.targets,
  })
}
