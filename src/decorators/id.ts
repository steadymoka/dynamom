import { IdDecoratorFactory } from "../interfaces/decorator"
import { metadataIds } from "../metadata"


export const Id: IdDecoratorFactory = () => (target, property) => {
  if (metadataIds.get(target)) {
    throw new Error("id decoartor must be only one per class")
  }
  metadataIds.set(target.constructor, {
    target,
    property,
  })
}
