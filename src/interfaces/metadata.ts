import { Identifier, MaybeArray } from "relater"


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

export interface MetadataGeneratedIndex {
  target: any
  property: Identifier
  indexHash?: string
  targets?: MaybeArray<any>
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
