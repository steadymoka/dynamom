import { IdDecoratorFactory } from "../interfaces/decorator"
import { metadataHashKeys } from "../metadata"


export const HashKey: IdDecoratorFactory = () => (target, property) => {
  if (metadataHashKeys.get(target)) {
    throw new Error("hash key decoartor must be only one per class")
  }
  metadataHashKeys.set(target.constructor, {
    target,
    property,
  })
}
