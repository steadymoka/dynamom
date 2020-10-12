import {
  MetadataEntity,
  MetadataColumn,
  MetadataGeneratedIndex,
  MetadataGeneratedValue,
  MetadataId,
  MetadataIndex,
} from '../interfaces/metadata'

let storage: MetadataStorage | null = null

export class MetadataStorage {

  static clearGlobalStorage() {
    storage = null
  }

  static getGlobalStorage(): MetadataStorage {
    if (!storage) {
      storage = new MetadataStorage()
    }
    return storage
  }

  public entities = new Map<Function, MetadataEntity>()
  public columns = new Map<Function, MetadataColumn[]>()
  public indexes = new Map<any, MetadataIndex[]>()
  public hashKeys = new Map<any, MetadataId>()
  public rangeKeys = new Map<any, MetadataId>()
  public generatedIndexes = new Map<any, MetadataGeneratedIndex[]>()
  public generatedValues = new Map<any, MetadataGeneratedValue[]>()
}
