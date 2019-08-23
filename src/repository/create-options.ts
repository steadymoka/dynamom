import { ConstructType, createOptions as createRelaterOptions, Identifier } from "relater"
import { RepositoryOptions } from "../interfaces/repository"
import { metadataHashKeys, metadataEntities, metadataGeneratedValues, metadataIndexes, metadataRangeKeys } from "../metadata"

export function createOptions<Entity>(ctor: ConstructType<Entity>): RepositoryOptions<Entity> {
  const entity = metadataEntities.get(ctor)
  if (!entity) {
    throw new Error("not defined entity")
  }
  const relaterOptions = createRelaterOptions(ctor)

  const hashKey = metadataHashKeys.get(ctor)
  if (!hashKey) {
    throw new Error("not defined hashKey")
  }
  const hashKeyColumn = relaterOptions.columns.find((column) => column.property === hashKey.property)
  if (!hashKeyColumn) {
    throw new Error("not defined hashKey column")
  }
  const rangeKey = metadataRangeKeys.get(ctor)
  let rangeKeyColumn
  if (rangeKey) {
    rangeKeyColumn = relaterOptions.columns.find((column) => column.property === rangeKey.property)
    if (!rangeKeyColumn) {
      throw new Error("not defined rangeKey column")
    }
  }

  return {
    tableName: entity.name,
    hashKey: {
      property: hashKey.property,
      sourceKey: hashKeyColumn.sourceKey,
    },
    rangeKey: rangeKeyColumn ? {
      property: rangeKey!.property,
      sourceKey: rangeKeyColumn.sourceKey,
    } : undefined,
    indexes: (metadataIndexes.get(ctor) || []).map(({ name, hash, range }) => {
      if (hash.keys.length == 0) {
        throw new Error("not defined index hashKey")  
      }
      let hashProperty: Identifier | undefined
      let hashSourceKey: string | undefined
      let generatedHashKey: string | undefined

      let rangeProperty: Identifier | undefined
      let rangeSourceKey: string | undefined
      let generatedRangeKey: string | undefined

      const hashSourceKeys = hash.keys.map((key) => relaterOptions.columns.find(({ property }) => property === key)!.sourceKey)
      const rangeSourceKeys = range.keys.map((key) => relaterOptions.columns.find(({ property }) => property === key)!.sourceKey)
      
      if (hash.keys.length == 1) {
        const hashColumn = relaterOptions.columns.find(({ property }) => property === hash.keys[0])
        if (!hashColumn) {
          throw new Error("not defined index hash column") 
        }
        hashProperty = hashColumn.property
        hashSourceKey = hashColumn.sourceKey
      }
      else {
        generatedHashKey = hashSourceKeys.join("__")
      }

      if (range) {
        if (range.keys.length == 1) {
          const rangeColumn = relaterOptions.columns.find(({ property }) => property === range.keys[0])
          if (!rangeColumn) {
            throw new Error("not defined index range column") 
          }
          rangeProperty = rangeColumn.property
          rangeSourceKey = rangeColumn.sourceKey
        }
        else {
          generatedRangeKey = rangeSourceKeys.join("__")
        }
      }

      return {
        name: name ? name : `index__${hashSourceKeys.join("__")}${range.keys.length > 0 ? `__${rangeSourceKeys.join("__")}` : ""}`,
        hashKey: {
          property: hashProperty,
          sourceKey: hashSourceKey,
          generated: generatedHashKey ? 
            {
              key: generatedHashKey,
              properties: hash.keys,
              sourceKeys: hashSourceKeys,
            } :
            undefined,
        },
        rangeKey: range.keys.length > 0 ? 
          {
            property: rangeProperty,
            sourceKey: rangeSourceKey,
            generated: generatedRangeKey ? 
              {
                key: generatedRangeKey,
                properties: range.keys,
                sourceKeys: rangeSourceKeys,
              } :
              undefined,
          } :
          undefined,
      }
    }),
    generatedValues: (metadataGeneratedValues.get(ctor) || []).map((value) => {
      const column = relaterOptions.columns.find(({ property }) => property === value.property)
      if (!column) {
        throw new Error("not defined index range column")
      }
      
      return {
        property: value.property,
        sourceKey: column.sourceKey,
        strategy: value.strategy,
      }
    }),
    ...relaterOptions,
  }
}
