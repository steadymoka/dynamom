import {
  MetadataEntity,
  MetadataGeneratedValue,
  MetadataId,
  MetadataIndex
} from "./interfaces/metadata"


export const metadataEntities = new Map<any, MetadataEntity>()
export const metadataIndexes = new Map<any, MetadataIndex[]>()
export const metadataHashKeys = new Map<any, MetadataId>()
export const metadataRangeKeys = new Map<any, MetadataId>()
export const metadataGeneratedValues = new Map<any, MetadataGeneratedValue[]>()
