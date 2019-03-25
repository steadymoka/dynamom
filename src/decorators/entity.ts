import { toUnderscore } from "relater/lib/utils/to-underscore"
import { EntityDecoratorFactory } from "../interfaces/decorator"
import { metadataEntities } from "../metadata"


export const Entity: EntityDecoratorFactory = (options = {}) => (target) => {
  if (metadataEntities.get(target)) {
    throw new Error("entity decoartor must be one")
  }
  metadataEntities.set(target, {
    target,
    name: options.name || toUnderscore(target.name)
  })
}
