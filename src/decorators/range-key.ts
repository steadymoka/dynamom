import { IdDecoratorFactory } from "../interfaces/decorator"
import { metadataRangeKeys } from "../metadata"


export const RangeKey: IdDecoratorFactory = () => (target, property) => {
  if (metadataRangeKeys.get(target)) {
    throw new Error("range key decoartor must be only one per class")
  }
  metadataRangeKeys.set(target.constructor, {
    target,
    property,
  })
}
