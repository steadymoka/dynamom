import { ConstructType } from '../interfaces/common'
import { RepositoryOptions } from '../interfaces/repository'
import { MetadataStorage } from '../metadata/storage'

export function createOptions<Entity>(ctor: ConstructType<Entity>, meatadataStorage?: MetadataStorage): RepositoryOptions<Entity> {
  meatadataStorage = meatadataStorage ?? MetadataStorage.getGlobalStorage()
  const entity = meatadataStorage.entities.get(ctor)
  if (!entity) {
    throw new Error('not defined entity')
  }
  const columns = meatadataStorage.columns.get(ctor) ?? []

  const hashKey = meatadataStorage.hashKeys.get(ctor)
  if (!hashKey) {
    throw new Error('not defined hashKey')
  }
  const hashKeyColumn = columns.find((column) => column.property === hashKey.property)
  if (!hashKeyColumn) {
    throw new Error('not defined hashKey column')
  }

  const rangeKey = meatadataStorage.rangeKeys.get(ctor)
  let rangeKeyColumn
  if (rangeKey) {
    rangeKeyColumn = columns.find((column) => column.property === rangeKey.property)
    if (!rangeKeyColumn) {
      throw new Error('not defined rangeKey column')
    }
  }

  return {
    target: entity.target,
    tableName: entity.name,
    columns,
    hashKey: {
      property: hashKey.property,
      sourceKey: hashKeyColumn.name,
    },
    rangeKey: rangeKeyColumn ? {
      property: rangeKey!.property,
      sourceKey: rangeKeyColumn.name,
    } : undefined,
    indexes: (meatadataStorage.indexes.get(ctor) || []).map(({ name, hash, range }) => {
      if (hash.keys.length == 0) {
        throw new Error('not defined index hashKey')
      }
      let hashProperty: string | symbol | undefined
      let hashSourceKey: string | undefined
      let generatedHashKey: string | undefined

      let rangeProperty: string | symbol | undefined
      let rangeSourceKey: string | undefined
      let generatedRangeKey: string | undefined

      const hashSourceKeys = hash.keys.map((key) => columns.find(({ property }) => property === key)!.name)
      const rangeSourceKeys = range.keys.map((key) => columns.find(({ property }) => property === key)!.name)

      if (hash.keys.length == 1) {
        const hashColumn = columns.find(({ property }) => property === hash.keys[0])
        if (!hashColumn) {
          throw new Error('not defined index hash column')
        }
        hashProperty = hashColumn.property
        hashSourceKey = hashColumn.name
      } else {
        generatedHashKey = hashSourceKeys.join('__')
      }

      if (range) {
        if (range.keys.length == 1) {
          const rangeColumn = columns.find(({ property }) => property === range.keys[0])
          if (!rangeColumn) {
            throw new Error('not defined index range column')
          }
          rangeProperty = rangeColumn.property
          rangeSourceKey = rangeColumn.name
        } else {
          generatedRangeKey = rangeSourceKeys.join('__')
        }
      }

      return {
        name: name ? name : `index__${hashSourceKeys.join('__')}${range.keys.length > 0 ? `__${rangeSourceKeys.join('__')}` : ''}`,
        hashKey: {
          property: hashProperty,
          sourceKey: hashSourceKey,
          generated: generatedHashKey
            ? {
              key: generatedHashKey,
              properties: hash.keys,
              sourceKeys: hashSourceKeys,
            }
            : undefined,
        },
        rangeKey: range.keys.length > 0
          ? {
            property: rangeProperty,
            sourceKey: rangeSourceKey,
            generated: generatedRangeKey
              ? {
                key: generatedRangeKey,
                properties: range.keys,
                sourceKeys: rangeSourceKeys,
              }
              : undefined,
          }
          : undefined,
      }
    }),
    generatedValues: (meatadataStorage.generatedValues.get(ctor) || []).map((value) => {
      const column = columns.find(({ property }) => property === value.property)
      if (!column) {
        throw new Error('not defined index range column')
      }

      return {
        property: value.property,
        sourceKey: column.name,
        strategy: value.strategy,
      }
    }),
  }
}
