import { ConstructType, createOptions as createRelaterOptions } from "relater"
import { RepositoryOptions } from "../interfaces/repository"
import { metadataHashKeys, metadataEntities, metadataGeneratedValues, metadataIndexes, metadataRangeKeys } from "../metadata"

export function createOptions<Entity>(ctor: ConstructType<Entity>): RepositoryOptions<Entity> {
  /* */
  const entity = metadataEntities.get(ctor)
  if (!entity) {
    throw new Error("not defined entity")
  }

  /* */
  const hashKey = metadataHashKeys.get(ctor)
  if (!hashKey) {
    throw new Error("not defined hashKey")
  }

  /* */
  const rangeKey = metadataRangeKeys.get(ctor)
  if (!rangeKey) {
    throw new Error("not defined rangeKey")
  }

  /* */
  const relaterOptions = createRelaterOptions(ctor)
  const hashKeyColumn = relaterOptions.columns.find((column) => column.property === hashKey.property)
  if (!hashKeyColumn) {
    throw new Error("not defined hashKey column")
  }
  const rangeKeyColumn = relaterOptions.columns.find((column) => column.property === rangeKey.property)
  if (!rangeKeyColumn) {
    throw new Error("not defined rangeKey column")
  }

  /* */
  return {
    tableName: entity.name,
    hashKey: {
      property: hashKey.property,
      sourceKey: hashKeyColumn.sourceKey,
    },
    rangeKey: {
      property: rangeKey.property,
      sourceKey: rangeKeyColumn.sourceKey,
    },
    indexes: (metadataIndexes.get(ctor) || []).map((value) => {
      const indexColumn = relaterOptions.columns.find((column) => column.property === value.property)
      if (!indexColumn) {
        throw new Error("not defined rangeKey column")
      }
      return {
        name: value.name,
        hashKey: indexColumn.sourceKey,
        rangeKey: value.rangeKey
      }
    }),
    generatedValues: (metadataGeneratedValues.get(ctor) || []).map((value) => ({
      property: value.property,
      strategy: value.strategy,
    })),
    ...relaterOptions,
  }
}
