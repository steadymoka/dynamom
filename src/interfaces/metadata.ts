import { MaybeArray, MaybePromise } from './common'

export interface MetadataEntity {
  target: any
  name: string
}

export interface MetadataColumn {
  target: Function
  property: string | symbol
  name: string
  onCreate?: (entity: any) => MaybePromise<any>
  onUpdate?: (entity: any) => MaybePromise<any>
}

export interface MetadataIndex {
  target: any
  name?: string
  hash: {
    keys: string[],
  }
  range: {
    keys: string[],
  }
}

export interface MetadataGeneratedIndex {
  target: any
  property: string | symbol
  indexHash?: string
  targets?: MaybeArray<any>
}

export interface MetadataGeneratedValue {
  target: any
  property: string | symbol
  strategy: string
}

export interface MetadataId {
  target: any
  property: string | symbol
}
