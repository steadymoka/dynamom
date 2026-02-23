import type { AttributeValue, TransactWriteItem } from '@aws-sdk/client-dynamodb'
import kuuid from 'kuuid'
import { v4 as uuid } from 'uuid'

import { Connection } from '../connection/connection'
import { toDynamo, toDynamoMap } from '../connection/transformer'
import { ExpressionBuilder } from '../expression/expression-builder'
import { FilterCondition } from '../expression/filter'
import { columnBy } from '../indexer/column-by'
import { MaybeArray } from '../interfaces/common'
import { DynamoCursor, UpdateItemOptions } from '../interfaces/connection'
import { DefaultRange } from '../interfaces/range'
import {
  CountOptions,
  CreateOptions,
  PersistOptions,
  RemoveOptions,
  RepositoryOptions,
  RetrieveOptions,
  RetrieveResult,
  ScanRetrieveOptions,
} from '../interfaces/repository'

function encodeBase64(cursor: Record<string, AttributeValue>): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

function decodeBase64(buffer: string): Record<string, AttributeValue> {
  return JSON.parse(Buffer.from(buffer, 'base64').toString('ascii'))
}

export class Repository<Entity extends object> {

  constructor(
    public connection: Connection,
    public options: RepositoryOptions<Entity>,
  ) {
  }

  toEntity(rows: any[]): Entity[]
  toEntity(rows: any): Entity
  toEntity(rows: MaybeArray<any>): MaybeArray<Entity> {
    if (!Array.isArray(rows)) {
      return this.toEntity([rows])[0]
    }
    return rows.map((row: any) => {
      const entity: any = {}
      for (const column of this.options.columns) {
        if (undefined !== row[column.name]) {
          entity[column.property] = row[column.name]
        }
      }

      Object.setPrototypeOf(entity, this.options.target.prototype)
      return entity
    })
  }

  toPlain(entities: Entity[]): any[]
  toPlain(entities: Entity): any
  toPlain(entities: Partial<Entity>[]): any[]
  toPlain(entities: Partial<Entity>): any
  toPlain(entities: any): MaybeArray<any> {
    if (!Array.isArray(entities)) {
      return this.toPlain([entities] as Entity[])[0]
    }
    return entities.map((entity) => {
      const row: any = {}
      for (const column of this.options.columns) {
        if (undefined !== entity[column.property]) {
          row[column.name] = entity[column.property]
        }
      }
      return row
    })
  }

  public async create(attrs: Partial<Entity>, createOptions?: CreateOptions): Promise<Entity> {
    const entity: any = { ...attrs }
    Object.setPrototypeOf(entity, this.options.target.prototype)
    const node = this.toPlain(entity as Entity)

    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === 'uuid') {
        node[generatedValue.sourceKey] = uuid()
      }
      if (generatedValue.strategy === 'kuuid') {
        node[generatedValue.sourceKey] = kuuid.idms()
      }
    }
    for (const index of this.options.indexes) {
      if (index.hashKey.generated) {
        node[index.hashKey.generated.key] = `${columnBy<Entity>(index.hashKey.generated.properties as any)(entity)}`
      }
      if (index.rangeKey && index.rangeKey.generated) {
        node[index.rangeKey.generated.key] = `${columnBy<Entity>(index.rangeKey.generated.properties as any)(entity)}__${new Date().getTime()}`
      }
    }

    const hashKey = node[this.options.hashKey.sourceKey]
    if (!hashKey) {
      throw new Error('hashKey not defined!')
    }

    if (createOptions?.condition) {
      await this.connection.putItem(this.options, {
        cursor: {
          hash: node[this.options.hashKey.sourceKey],
          range: this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined,
        },
        node,
      }, createOptions.condition)
    } else {
      await this.connection.putItems(this.options, [{
        cursor: {
          hash: node[this.options.hashKey.sourceKey],
          range: this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined,
        },
        node,
      }])
    }
    return this.toEntity(node)
  }

  public async upsert(attrs: Partial<Entity>): Promise<Entity> {
    const entity: any = { ...attrs }
    Object.setPrototypeOf(entity, this.options.target.prototype)
    const node = this.toPlain(entity as Entity)

    for (const generatedValue of this.options.generatedValues) {
      if (!node[generatedValue.sourceKey]) {
        if (generatedValue.strategy === 'uuid') {
          node[generatedValue.sourceKey] = uuid()
        }
        if (generatedValue.strategy === 'kuuid') {
          node[generatedValue.sourceKey] = kuuid.idms()
        }
      }
    }
    for (const index of this.options.indexes) {
      if (index.hashKey.generated) {
        node[index.hashKey.generated.key] = `${columnBy<Entity>(index.hashKey.generated.properties as any)(entity)}`
      }
      if (index.rangeKey && index.rangeKey.generated) {
        node[index.rangeKey.generated.key] = `${columnBy<Entity>(index.rangeKey.generated.properties as any)(entity)}__${new Date().getTime()}`
      }
    }

    const hashKey = node[this.options.hashKey.sourceKey]
    if (!hashKey) {
      throw new Error('hashKey not defined!')
    }

    await this.connection.putItem(this.options, {
      cursor: {
        hash: node[this.options.hashKey.sourceKey],
        range: this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined,
      },
      node,
    })
    return this.toEntity(node)
  }

  public async findOne({ indexName, hash, range }: { indexName?: string, hash: string | number, range?: string | number }): Promise<Entity | undefined> {
    if (!indexName) {
      if (this.options.rangeKey && !range) {
        return (await this.retrieve({ hash, limit: 1 })).nodes[0]
      }
      const cursor = {
        hash,
        range,
      }
      const node = await this.connection.getItem(this.options, cursor)
      if (node) {
        return this.toEntity(node)
      }
      return undefined
    }
    return (await this.retrieve({ indexName, hash, rangeOption: range ? new DefaultRange(range) : undefined, limit: 1 })).nodes[0]
  }

  public async findOnes(cursors: DynamoCursor[]): Promise<Entity[] | undefined> {
    const nodes = await this.connection.getManyItems(this.options, cursors)
    if (nodes) {
      return this.toEntity(nodes)
    }
    return undefined
  }

  public async count({ indexName, hash }: CountOptions): Promise<number> {
    if (!hash) {
      return Promise.resolve(0)
    }
    return await this.connection.count(this.options, indexName, hash)
  }

  public async retrieve({ indexName, hash, rangeOption, filter, select, limit = 20, after, desc = false }: RetrieveOptions<Entity> = { hash: 'all' }): Promise<RetrieveResult<Entity>> {
    const nodes: Entity[] = []

    const projection = select ? this.propertiesToColumns(select) : undefined

    const result = await this.connection.query(this.options, {
      indexName,
      hash,
      rangeOption,
      filter,
      projection,
      limit,
      after: after ? decodeBase64(after) : undefined,
      desc,
    })
    const endCursor = result.endCursor

    result.nodes.forEach((node) => {
      nodes.push(this.toEntity(node))
    })

    if (endCursor) {
      return {
        nodes,
        endCursor: encodeBase64(endCursor),
      }
    }
    return {
      nodes,
    }
  }

  public async scan({ filter, select, limit, after }: ScanRetrieveOptions<Entity> = {}): Promise<RetrieveResult<Entity>> {
    const projection = select ? this.propertiesToColumns(select) : undefined

    const result = await this.connection.scan(this.options, {
      filter,
      projection,
      limit,
      after: after ? decodeBase64(after) : undefined,
    })

    const nodes: Entity[] = result.nodes.map(node => this.toEntity(node))

    if (result.endCursor) {
      return {
        nodes,
        endCursor: encodeBase64(result.endCursor),
      }
    }
    return { nodes }
  }

  public async persist(entity: Entity, persistOptions?: PersistOptions): Promise<void> {
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const updateOpts: UpdateItemOptions | undefined = persistOptions
      ? {
        remove: persistOptions.remove ? this.propertiesToColumns(persistOptions.remove as any) : undefined,
        condition: persistOptions.condition,
      }
      : undefined

    await this.connection.updateItem(this.options, {
      cursor: range
        ? {
          hash,
          range,
        }
        : {
          hash,
        },
      node: this.toPlain(entity),
    }, updateOpts)
  }

  public async increment(entity: Entity, property: keyof Entity, amount: number = 1): Promise<void> {
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const columnName = this.propertyToColumn(property as string)

    await this.connection.updateItem(this.options, {
      cursor: range ? { hash, range } : { hash },
      node: {} as any,
    }, {
      add: { [columnName]: amount },
    })
  }

  public async removeAttributes(entity: Entity, properties: (keyof Entity)[]): Promise<void> {
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const columnNames = this.propertiesToColumns(properties)

    await this.connection.updateItem(this.options, {
      cursor: range ? { hash, range } : { hash },
      node: {} as any,
    }, {
      remove: columnNames,
    })
  }

  public async remove(entity: Entity, removeOptions?: RemoveOptions): Promise<void> {
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    if (removeOptions?.condition) {
      await this.connection.deleteItem(
        this.options,
        `${hash}`,
        range !== undefined ? `${range}` : undefined,
        removeOptions.condition,
      )
    } else {
      await this.connection.deleteManyItems(this.options, [
        range
          ? { hash, range }
          : { hash },
      ])
    }
  }

  // Transaction helpers

  public buildTransactPut(entity: Partial<Entity>, condition?: FilterCondition): TransactWriteItem {
    const node = this.toPlain(entity as Entity)
    const hashValue = node[this.options.hashKey.sourceKey]
    const rangeValue = this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined

    const item = this.options.rangeKey
      ? {
        [this.options.hashKey.sourceKey]: toDynamo(hashValue),
        [this.options.rangeKey.sourceKey]: toDynamo(rangeValue),
        ...toDynamoMap(node),
      }
      : {
        [this.options.hashKey.sourceKey]: toDynamo(hashValue),
        ...toDynamoMap(node),
      }

    const put: any = {
      TableName: this.options.tableName,
      Item: item,
    }

    if (condition) {
      const builder = new ExpressionBuilder()
      put.ConditionExpression = condition.build(builder)
      const names = builder.getNames()
      const values = builder.getValues()
      if (Object.keys(names).length > 0) {
        put.ExpressionAttributeNames = names
      }
      if (Object.keys(values).length > 0) {
        put.ExpressionAttributeValues = values
      }
    }

    return { Put: put }
  }

  public buildTransactDelete(entity: Entity, condition?: FilterCondition): TransactWriteItem {
    const hash = (entity as any)[this.options.hashKey.property]
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const Key = this.options.rangeKey
      ? {
        [this.options.hashKey.sourceKey]: toDynamo(hash),
        [this.options.rangeKey.sourceKey]: toDynamo(range),
      }
      : {
        [this.options.hashKey.sourceKey]: toDynamo(hash),
      }

    const del: any = {
      TableName: this.options.tableName,
      Key,
    }

    if (condition) {
      const builder = new ExpressionBuilder()
      del.ConditionExpression = condition.build(builder)
      const names = builder.getNames()
      const values = builder.getValues()
      if (Object.keys(names).length > 0) {
        del.ExpressionAttributeNames = names
      }
      if (Object.keys(values).length > 0) {
        del.ExpressionAttributeValues = values
      }
    }

    return { Delete: del }
  }

  public buildTransactUpdate(entity: Entity, updateOpts?: UpdateItemOptions): TransactWriteItem {
    const hash = (entity as any)[this.options.hashKey.property]
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const hashKey = this.options.hashKey.sourceKey
    const rangeKey = this.options.rangeKey?.sourceKey
    const node = this.toPlain(entity)
    const keys = Object.keys(node).filter(k => k !== hashKey && k !== rangeKey)

    const Key = this.options.rangeKey
      ? {
        [hashKey]: toDynamo(hash),
        [rangeKey!]: toDynamo(range),
      }
      : {
        [hashKey]: toDynamo(hash),
      }

    const expressionNames: Record<string, string> = {}
    const expressionValues: Record<string, AttributeValue> = {}

    const setParts = keys.map(key => {
      expressionNames[`#${key}`] = key
      expressionValues[`:${key}`] = toDynamo(node[key])
      return `#${key} = :${key}`
    })

    const removeParts: string[] = []
    if (updateOpts?.remove) {
      for (const attr of updateOpts.remove) {
        const placeholder = `#rm_${attr}`
        expressionNames[placeholder] = attr
        removeParts.push(placeholder)
      }
    }

    const addParts: string[] = []
    if (updateOpts?.add) {
      for (const [attr, amount] of Object.entries(updateOpts.add)) {
        const namePlaceholder = `#add_${attr}`
        const valPlaceholder = `:add_${attr}`
        expressionNames[namePlaceholder] = attr
        expressionValues[valPlaceholder] = toDynamo(amount)
        addParts.push(`${namePlaceholder} ${valPlaceholder}`)
      }
    }

    const parts: string[] = []
    if (setParts.length > 0) parts.push(`SET ${setParts.join(', ')}`)
    if (removeParts.length > 0) parts.push(`REMOVE ${removeParts.join(', ')}`)
    if (addParts.length > 0) parts.push(`ADD ${addParts.join(', ')}`)

    const update: any = {
      TableName: this.options.tableName,
      Key,
      UpdateExpression: parts.join(' '),
      ExpressionAttributeNames: expressionNames,
    }

    if (Object.keys(expressionValues).length > 0) {
      update.ExpressionAttributeValues = expressionValues
    }

    if (updateOpts?.condition) {
      const builder = new ExpressionBuilder()
      update.ConditionExpression = updateOpts.condition.build(builder)
      Object.assign(expressionNames, builder.getNames())
      const condValues = builder.getValues()
      if (Object.keys(condValues).length > 0) {
        update.ExpressionAttributeValues = { ...expressionValues, ...condValues }
      }
    }

    return { Update: update }
  }

  public buildTransactConditionCheck(entity: Entity, condition: FilterCondition): TransactWriteItem {
    const hash = (entity as any)[this.options.hashKey.property]
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    const Key = this.options.rangeKey
      ? {
        [this.options.hashKey.sourceKey]: toDynamo(hash),
        [this.options.rangeKey.sourceKey]: toDynamo(range),
      }
      : {
        [this.options.hashKey.sourceKey]: toDynamo(hash),
      }

    const builder = new ExpressionBuilder()
    const conditionExpression = condition.build(builder)

    const check: any = {
      TableName: this.options.tableName,
      Key,
      ConditionExpression: conditionExpression,
    }

    const names = builder.getNames()
    const values = builder.getValues()
    if (Object.keys(names).length > 0) {
      check.ExpressionAttributeNames = names
    }
    if (Object.keys(values).length > 0) {
      check.ExpressionAttributeValues = values
    }

    return { ConditionCheck: check }
  }

  // Private helpers

  private propertyToColumn(property: string): string {
    const column = this.options.columns.find(c => c.property === property)
    return column ? column.name : property
  }

  private propertiesToColumns(properties: (string | number | symbol)[]): string[] {
    return properties.map(p => this.propertyToColumn(p as string))
  }

}
