

export interface EntityDecoratorOptions {
  name?: string
}

export interface GeneratedValueDecoratorOptions {
  strategy?: string
}

export type EntityDecoratorFactory = (options?: EntityDecoratorOptions) => ClassDecorator

export type IdDecoratorFactory = () => PropertyDecorator

export type GeneratedValueDecoratorFactory = (options?: GeneratedValueDecoratorOptions) => PropertyDecorator
