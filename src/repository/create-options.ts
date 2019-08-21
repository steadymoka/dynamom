import { ConstructType, createOptions as createRelaterOptions } from "relater"
import { RepositoryOptions } from "../interfaces/repository"
import { metadataHashKeys, metadataEntities, metadataGeneratedValues, metadataIndexes, metadataRangeKeys, metadataGeneratedIndexes } from "../metadata"

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
    indexes: (metadataIndexes.get(ctor) || []).map(({ property, name, rangeKeys }) => {
      const indexColumn = relaterOptions.columns.find((column) => column.property === property)
      if (!indexColumn) {
        throw new Error("not defined rangeKey column")
      }
      return {
        name: name,
        hashKey: indexColumn.sourceKey,
        rangeKeys,
      }
    }),
    generatedIndexes: (metadataGeneratedIndexes.get(ctor) || []).map((value) => ({
      property: value.property,
      indexHash: value.indexHash,
      targets: value.targets,
    })), 
    generatedValues: (metadataGeneratedValues.get(ctor) || []).map((value) => ({
      property: value.property,
      strategy: value.strategy,
    })),
    ...relaterOptions,
  }
}
