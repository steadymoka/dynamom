import { MaybePromise } from '../interfaces/common'
import { MetadataStorage } from '../metadata/storage'

export interface ColumnParams<Entity> {
  name?: string
  onCreate?: (entity: Entity) => MaybePromise<any>
  onUpdate?: (entity: Entity) => MaybePromise<any>
  metadataStorage?: MetadataStorage
}

export function Column<Entity = Record<string, any>>(params: ColumnParams<Entity> = {}): PropertyDecorator {
  return (target, property) => {
    const metadataColumns = (params.metadataStorage ?? MetadataStorage.getGlobalStorage()).columns
    let columns = metadataColumns.get(target.constructor)

    if (!columns) {
      columns = []
      metadataColumns.set(target.constructor, columns)
    }

    columns.push({
      target: target.constructor,
      property,
      name: params.name ?? (typeof property === 'string' ? property : property.toString()),
      onCreate: params.onCreate,
      onUpdate: params.onUpdate,
    })
  }
}
