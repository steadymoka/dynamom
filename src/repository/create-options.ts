import { ConstructType, createOptions as createRelaterOptions } from "relater"
import { RepositoryOptions } from "../interfaces/repository"
import { metadataIds, metadataEntities, metadataGeneratedValues, metadataIndexes } from "../metadata"


export function createOptions<Entity>(ctor: ConstructType<Entity>): RepositoryOptions<Entity> {
  const entity = metadataEntities.get(ctor)
  if (!entity) {
    throw new Error("not defined entity")
  }
  const id = metadataIds.get(ctor)
  if (!id) {
    throw new Error("not defined id")
  }
  const relaterOptions = createRelaterOptions(ctor)
  const idColumn = relaterOptions.columns.find((column) => column.property === id.property)
  if (!idColumn) {
    throw new Error("not defined id column")
  }
  return {
    name: entity.name,
    id: {
      property: id.property,
      sourceKey: idColumn.sourceKey,
    },
    indexes: (metadataIndexes.get(ctor) || []).map(({name, indexer}) => ({
      name,
      indexer,
    })),
    generatedValues: (metadataGeneratedValues.get(ctor) || []).map((value) => ({
      property: value.property,
      strategy: value.strategy,
    })),
    ...relaterOptions,
  }
}
