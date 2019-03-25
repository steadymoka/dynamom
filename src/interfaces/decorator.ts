import { MaybeArray } from "relater"


export interface EntityDecoratorOptions {
  name?: string
}

export interface GeneratedValueDecoratorOptions {
  strategy?: string
}

export type EntityDecoratorFactory = (options?: EntityDecoratorOptions) => ClassDecorator

export type IdDecoratorFactory = () => PropertyDecorator

export type GeneratedValueDecoratorFactory = (options?: GeneratedValueDecoratorOptions) => PropertyDecorator

export type IndexDecoratorFactory = <P = any>(name: string, indexer: (self: P) => string) => ClassDecorator
export type ColumnIndexDecoratorFactory = <P = any>(name: string, columns: MaybeArray<keyof P>) => ClassDecorator
