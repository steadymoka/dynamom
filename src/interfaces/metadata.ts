import { Identifier } from "relater"


export interface MetadataEntity {
  target: any
  name: string
}

export interface MetadataIndex {
  target: any
  property: Identifier
  name: string
  rangeKey?: string
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
