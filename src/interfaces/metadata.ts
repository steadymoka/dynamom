import { Identifier } from "relater"


export interface MetadataEntity {
  target: any
  name: string
}

export interface MetadataIndex {
  target: any
  name: string
  indexer(entity: any): string
}

export interface MetadataGeneratedValue {
  target: any
  property: Identifier
  strategy: string
}

export interface MetadataId {
  target: any
  property: Identifier
}
