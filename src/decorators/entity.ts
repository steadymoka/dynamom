import { MetadataStorage } from '../metadata/storage'

export interface EntityParams {
  name?: string
  metadataStorage?: MetadataStorage
}

export function Entity(params: EntityParams): ClassDecorator {
  return (target) => {
    const metadataEntities = (params.metadataStorage ?? MetadataStorage.getGlobalStorage()).entities

    if (metadataEntities.get(target)) {
      throw new Error('entity decoartor must be one')
    }

    metadataEntities.set(target, {
      target,
      name: params.name ?? target.name,
    })
  }
}
