import { ColumnIndexDecoratorFactory } from "../interfaces/decorator"
import { metadataIndexes } from "../metadata"


export const ColumnIndex: ColumnIndexDecoratorFactory = (name, columns) => (target) => {
  let indexes = metadataIndexes.get(target)
  if (!indexes) {
    indexes = []
    metadataIndexes.set(target, indexes)
  }
  indexes.push({
    target,
    name,
    indexer: Array.isArray(columns) ?
      (self) => columns.map(column => self[column]).join("__") :
      (self) => self[columns],
  })
}
