import { Indexer, MaybeArray } from '../interfaces/common'

export function columnBy<P>(columns: MaybeArray<keyof P>): Indexer<P> {
  return Array.isArray(columns)
    ? (entity) => columns.map(column => entity[column]).join('__')
    : (entity) => `${entity[columns]}`
}
