import { MaybeArray } from "relater"

export interface EntityDecoratorOptions {
  name?: string
}

export interface GeneratedIndexDecoratorOptions {
  indexHash?: string
  targets?: MaybeArray<any>
}

export interface GeneratedValueDecoratorOptions {
  strategy?: string
}

export interface IndexDecoratorOptions {
  name?: string
  rangeKey?: string
}

export type EntityDecoratorFactory = (options?: EntityDecoratorOptions) => ClassDecorator

export type IdDecoratorFactory = () => PropertyDecorator

export type GeneratedValueDecoratorFactory = (options?: GeneratedValueDecoratorOptions) => PropertyDecorator

export type GeneratedIndexDecoratorFactory = (options?: GeneratedIndexDecoratorOptions) => PropertyDecorator

export type IndexDecoratorFactory = (options?: IndexDecoratorOptions) => PropertyDecorator
