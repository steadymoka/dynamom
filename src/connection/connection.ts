import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  BatchGetItemCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteItemsCommand,
  TransactGetItemsCommand,
} from '@aws-sdk/client-dynamodb'
import type { AttributeValue, WriteRequest, TransactWriteItem, TransactGetItem } from '@aws-sdk/client-dynamodb'

import { ExpressionBuilder } from '../expression/expression-builder'
import { FilterCondition } from '../expression/filter'
import { ConstructType } from '../interfaces/common'
import { DynamoCursor, DynamoNode, QueryOptions, QueryResult, ScanOptions, ScanResult, UpdateItemOptions } from '../interfaces/connection'
import { RepositoryOptions } from '../interfaces/repository'
import { createOptions } from '../repository/create-options'
import { Repository } from '../repository/repository'
import { fromDynamoMap, toDynamo, toDynamoMap } from './transformer'

export class Connection {

  public repositories = new Map<ConstructType<any>, Repository<any>>()

  public constructor(public client: DynamoDBClient) { }

  public getRepository<Entity extends object, R extends Repository<Entity>>(ctor: ConstructType<Entity>): R {
    let repository = this.repositories.get(ctor)
    if (!repository) {
      repository = new Repository(this, createOptions(ctor))
      this.repositories.set(ctor, repository)
    }
    return repository as R
  }

  public async putItems<P = any>(options: RepositoryOptions<P>, rows: DynamoNode<P>[] = []): Promise<boolean[]> {
    if (rows.length === 0) {
      return []
    }

    const writeRequests: WriteRequest[] = rows.map(({ cursor: { hash, range }, node }): WriteRequest => {
      return options.rangeKey
        ? {
          PutRequest: {
            Item: {
              [options.hashKey.sourceKey]: toDynamo(hash),
              [options.rangeKey.sourceKey]: toDynamo(range),
              ...toDynamoMap(node as Record<string, any>),
            },
          },
        }
        : {
          PutRequest: {
            Item: {
              [options.hashKey.sourceKey]: toDynamo(hash),
              ...toDynamoMap(node as Record<string, any>),
            },
          },
        }
    })

    const result = await this.client.send(new BatchWriteItemCommand({
      RequestItems: {
        [`${options.tableName}`]: writeRequests,
      },
    }))

    if (result.UnprocessedItems && result.UnprocessedItems[`${options.tableName}`]) {
      const failKeys = result.UnprocessedItems[`${options.tableName}`]
        .filter(({ DeleteRequest }) => DeleteRequest)
        .map(({ DeleteRequest }) => DeleteRequest!.Key!)

      return rows.map(({ cursor: { hash, range } }) => {
        const foundFailKey = failKeys.find((failKey) => failKey[options.hashKey.sourceKey].S === hash && (
          !!options.rangeKey && failKey[options.rangeKey.sourceKey].S === range
          || !!options.rangeKey && failKey[options.rangeKey.sourceKey].N === range
        ))
        return !foundFailKey
      })
    }
    return rows.map(() => true)
  }

  public async putItem<P = any>(options: RepositoryOptions<P>, row: DynamoNode<P>, condition?: FilterCondition): Promise<boolean> {
    const params: any = {
      TableName: options.tableName,
      ReturnValues: 'ALL_OLD',
      Item: options.rangeKey
        ? {
          [options.hashKey.sourceKey]: toDynamo(row.cursor.hash),
          [options.rangeKey.sourceKey]: toDynamo(row.cursor.range),
          ...toDynamoMap(row.node as Record<string, any>),
        }
        : {
          [options.hashKey.sourceKey]: toDynamo(row.cursor.hash),
          ...toDynamoMap(row.node as Record<string, any>),
        },
    }

    if (condition) {
      const builder = new ExpressionBuilder()
      params.ConditionExpression = condition.build(builder)
      const names = builder.getNames()
      const values = builder.getValues()
      if (Object.keys(names).length > 0) {
        params.ExpressionAttributeNames = names
      }
      if (Object.keys(values).length > 0) {
        params.ExpressionAttributeValues = values
      }
    }

    await this.client.send(new PutItemCommand(params))
    return true
  }

  public async updateItem<P = any>(options: RepositoryOptions<P>, row: DynamoNode<P>, updateOptions?: UpdateItemOptions): Promise<boolean> {
    const hashKey = options.hashKey.sourceKey
    const rangeKey = options.rangeKey ? options.rangeKey.sourceKey : undefined
    const removeSet = new Set(updateOptions?.remove ?? [])
    const addSet = new Set(Object.keys(updateOptions?.add ?? {}))
    const deleteFromSetKeys = new Set(Object.keys(updateOptions?.deleteFromSet ?? {}))
    const appendToListKeys = new Set(Object.keys(updateOptions?.appendToList ?? {}))
    const setIfNotExistsKeys = new Set(Object.keys(updateOptions?.setIfNotExists ?? {}))
    const keys = Object.keys(row.node as Record<string, any>)
      .filter((key) => key != hashKey && key != rangeKey)
      .filter((key) => !removeSet.has(key) && !addSet.has(key) && !deleteFromSetKeys.has(key))
      .filter((key) => !appendToListKeys.has(key) && !setIfNotExistsKeys.has(key))

    const Key = rangeKey
      ? {
        [`${hashKey}`]: toDynamo(row.cursor.hash),
        [`${rangeKey}`]: toDynamo(row.cursor.range),
      }
      : {
        [`${hashKey}`]: toDynamo(row.cursor.hash),
      }

    const expressionNames: Record<string, string> = {}
    const expressionValues: Record<string, AttributeValue> = {}

    // Build SET clause (excluding attributes in REMOVE/ADD)
    const setParts: string[] = keys.map(key => {
      expressionNames[`#${key}`] = key
      expressionValues[`:${key}`] = toDynamo((row.node as any)[key])
      return `#${key} = :${key}`
    })

    // Build REMOVE clause
    const removeParts: string[] = []
    if (updateOptions?.remove) {
      for (const attr of updateOptions.remove) {
        const placeholder = `#rm_${attr}`
        expressionNames[placeholder] = attr
        removeParts.push(placeholder)
      }
    }

    // Build ADD clause
    const addParts: string[] = []
    if (updateOptions?.add) {
      for (const [attr, amount] of Object.entries(updateOptions.add)) {
        const namePlaceholder = `#add_${attr}`
        const valPlaceholder = `:add_${attr}`
        expressionNames[namePlaceholder] = attr
        expressionValues[valPlaceholder] = toDynamo(amount)
        addParts.push(`${namePlaceholder} ${valPlaceholder}`)
      }
    }

    // Build list_append SET clause
    if (updateOptions?.appendToList) {
      for (const [attr, { values, prepend }] of Object.entries(updateOptions.appendToList)) {
        const namePlaceholder = `#la_${attr}`
        const valPlaceholder = `:la_${attr}`
        const emptyPlaceholder = `:la_empty_${attr}`
        expressionNames[namePlaceholder] = attr
        expressionValues[valPlaceholder] = toDynamo(values)
        expressionValues[emptyPlaceholder] = toDynamo([])
        if (prepend) {
          setParts.push(`${namePlaceholder} = list_append(${valPlaceholder}, if_not_exists(${namePlaceholder}, ${emptyPlaceholder}))`)
        } else {
          setParts.push(`${namePlaceholder} = list_append(if_not_exists(${namePlaceholder}, ${emptyPlaceholder}), ${valPlaceholder})`)
        }
      }
    }

    // Build if_not_exists SET clause
    if (updateOptions?.setIfNotExists) {
      for (const [attr, value] of Object.entries(updateOptions.setIfNotExists)) {
        const namePlaceholder = `#ine_${attr}`
        const valPlaceholder = `:ine_${attr}`
        expressionNames[namePlaceholder] = attr
        expressionValues[valPlaceholder] = toDynamo(value)
        setParts.push(`${namePlaceholder} = if_not_exists(${namePlaceholder}, ${valPlaceholder})`)
      }
    }

    // Build DELETE clause (remove elements from Set)
    const deleteParts: string[] = []
    if (updateOptions?.deleteFromSet) {
      for (const [attr, values] of Object.entries(updateOptions.deleteFromSet)) {
        const namePlaceholder = `#del_${attr}`
        const valPlaceholder = `:del_${attr}`
        expressionNames[namePlaceholder] = attr
        expressionValues[valPlaceholder] = toDynamo(values)
        deleteParts.push(`${namePlaceholder} ${valPlaceholder}`)
      }
    }

    // Combine UpdateExpression parts
    const parts: string[] = []
    if (setParts.length > 0) {
      parts.push(`SET ${setParts.join(', ')}`)
    }
    if (removeParts.length > 0) {
      parts.push(`REMOVE ${removeParts.join(', ')}`)
    }
    if (addParts.length > 0) {
      parts.push(`ADD ${addParts.join(', ')}`)
    }
    if (deleteParts.length > 0) {
      parts.push(`DELETE ${deleteParts.join(', ')}`)
    }

    if (parts.length === 0) {
      return true
    }

    const params: any = {
      TableName: options.tableName,
      Key,
      UpdateExpression: parts.join(' '),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: Object.keys(expressionValues).length > 0 ? expressionValues : undefined,
    }

    // Build ConditionExpression
    if (updateOptions?.condition) {
      const builder = new ExpressionBuilder()
      params.ConditionExpression = updateOptions.condition.build(builder)
      Object.assign(expressionNames, builder.getNames())
      const condValues = builder.getValues()
      if (Object.keys(condValues).length > 0) {
        params.ExpressionAttributeValues = { ...expressionValues, ...condValues }
      }
    }

    await this.client.send(new UpdateItemCommand(params))
    return true
  }

  public async getItem<P = any>(options: RepositoryOptions<P>, cursor: DynamoCursor): Promise<any | null> {
    const data = await this.client.send(new GetItemCommand({
      TableName: `${options.tableName}`,
      Key: options.rangeKey
        ? {
          [options.hashKey.sourceKey]: toDynamo(cursor.hash),
          [options.rangeKey.sourceKey]: toDynamo(cursor.range),
        }
        : {
          [options.hashKey.sourceKey]: toDynamo(cursor.hash),
        },
    }))
    if (data && data.Item) {
      return fromDynamoMap(data.Item)
    }
    return null
  }

  public async getManyItems<P = any>(options: RepositoryOptions<P>, cursors: DynamoCursor[]): Promise<any[]> {
    if (cursors.length === 0) {
      return []
    }

    const result = await this.client.send(new BatchGetItemCommand({
      RequestItems: {
        [`${options.tableName}`]: {
          Keys: cursors.map((cursor) => options.rangeKey
            ? {
              [options.hashKey.sourceKey]: toDynamo(cursor.hash),
              [options.rangeKey.sourceKey]: toDynamo(cursor.range),
            }
            : {
              [options.hashKey.sourceKey]: toDynamo(cursor.hash),
            }),
        },
      },
    }))

    if (result && result.Responses && result.Responses[`${options.tableName}`]) {
      return result.Responses[`${options.tableName}`].map(fromDynamoMap)
    }
    return []
  }

  public async query<P = any>(options: RepositoryOptions<P>, { indexName, hash, rangeOption, filter, projection, limit = 20, after, desc = false }: QueryOptions<P> = { hash: 'all' }): Promise<QueryResult<P>> {
    const hashKey = indexName
      ? (() => {
        const indexHash = options.indexes.find(({ name }) => name == indexName)!.hashKey
        if (indexHash.generated) {
          return indexHash.generated.key
        }
        return indexHash.sourceKey!
      })()
      : options.hashKey.sourceKey
    let isGeneratedRangeKey = false
    const rangeKey = indexName
      ? (() => {
        const indexRange = options.indexes.find(({ name }) => name == indexName)!.rangeKey
        if (!indexRange) {
          return undefined
        }

        if (indexRange.generated) {
          isGeneratedRangeKey = true
          return indexRange.generated.key
        }
        return indexRange.sourceKey
      })()
      : options.rangeKey ? options.rangeKey.sourceKey : undefined

    const expressionNames: Record<string, string> = rangeOption
      ? { '#hashkey': hashKey, '#rangekey': rangeKey! }
      : { '#hashkey': hashKey }

    const expressionValues: Record<string, AttributeValue> = rangeOption
      ? {
        ':hashkey': typeof hash === 'string' ? { S: hash } : { N: `${hash}` },
        ':rangekey': isGeneratedRangeKey
          ? { S: `${rangeOption.range}__` }
          : typeof rangeOption.range === 'string'
            ? { S: `${rangeOption.range}` }
            : { N: `${rangeOption.range}` },
        ...(rangeOption.getExtraValues?.()
          ? Object.entries(rangeOption.getExtraValues()).reduce((acc, [key, val]) => {
            acc[key] = typeof val === 'string' ? { S: val } : { N: `${val}` }
            return acc
          }, {} as Record<string, any>)
          : {}),
      }
      : {
        ':hashkey': typeof hash === 'string' ? { S: hash } : { N: `${hash}` },
      }

    // Build FilterExpression
    let filterExpression: string | undefined
    if (filter) {
      const builder = new ExpressionBuilder()
      filterExpression = filter.build(builder)
      Object.assign(expressionNames, builder.getNames())
      Object.assign(expressionValues, builder.getValues())
    }

    // Build ProjectionExpression
    let projectionExpression: string | undefined
    if (projection && projection.length > 0) {
      const projPlaceholders = projection.map(attr => {
        const placeholder = `#proj_${attr}`
        expressionNames[placeholder] = attr
        return placeholder
      })
      projectionExpression = projPlaceholders.join(', ')
    }

    const result = await this.client.send(new QueryCommand({
      TableName: `${options.tableName}`,
      IndexName: indexName ? indexName : undefined,
      Limit: limit,
      KeyConditionExpression: rangeOption
        ? isGeneratedRangeKey == true
          ? '#hashkey = :hashkey and begins_with(#rangekey, :rangekey)'
          : `#hashkey = :hashkey and ${rangeOption.getExpression()}`
        : '#hashkey = :hashkey',
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      FilterExpression: filterExpression,
      ProjectionExpression: projectionExpression,
      ExclusiveStartKey: after ? after : undefined,
      ScanIndexForward: !desc,
    }))

    const nodes: P[] = (result.Items || []).map((item) => {
      return fromDynamoMap(item) as P
    })
    if (result.LastEvaluatedKey) {
      return {
        nodes,
        endCursor: result.LastEvaluatedKey,
      }
    }
    return {
      nodes,
    }
  }

  public async scan<P = any>(options: RepositoryOptions<P>, { filter, projection, limit, after }: ScanOptions<P> = {}): Promise<ScanResult<P>> {
    const params: any = {
      TableName: options.tableName,
    }

    if (limit) {
      params.Limit = limit
    }
    if (after) {
      params.ExclusiveStartKey = after
    }

    const expressionNames: Record<string, string> = {}
    const expressionValues: Record<string, AttributeValue> = {}

    if (filter) {
      const builder = new ExpressionBuilder()
      params.FilterExpression = filter.build(builder)
      Object.assign(expressionNames, builder.getNames())
      Object.assign(expressionValues, builder.getValues())
    }

    if (projection && projection.length > 0) {
      const projPlaceholders = projection.map(attr => {
        const placeholder = `#proj_${attr}`
        expressionNames[placeholder] = attr
        return placeholder
      })
      params.ProjectionExpression = projPlaceholders.join(', ')
    }

    if (Object.keys(expressionNames).length > 0) {
      params.ExpressionAttributeNames = expressionNames
    }
    if (Object.keys(expressionValues).length > 0) {
      params.ExpressionAttributeValues = expressionValues
    }

    const result = await this.client.send(new ScanCommand(params))

    const nodes: P[] = (result.Items || []).map((item) => fromDynamoMap(item) as P)

    if (result.LastEvaluatedKey) {
      return { nodes, endCursor: result.LastEvaluatedKey }
    }
    return { nodes }
  }

  public async count<P = any>(options: RepositoryOptions<P>, indexName?: string, hash: string | number = ''): Promise<number> {
    const hashKey = indexName
      ? (() => {
        const indexHash = options.indexes.find(({ name }) => name == indexName)!.hashKey
        if (indexHash.generated) {
          return indexHash.generated.key
        }
        return indexHash.sourceKey!
      })()
      : options.hashKey.sourceKey

    const result = await this.client.send(new QueryCommand({
      TableName: `${options.tableName}`,
      IndexName: indexName ? indexName : undefined,
      Select: 'COUNT',
      KeyConditionExpression: '#hashkey = :hashkey',
      ExpressionAttributeNames: {
        '#hashkey': hashKey,
      },
      ExpressionAttributeValues: {
        ':hashkey': toDynamo(hash),
      },
    }))
    return result.Count || 0
  }

  public async deleteItem<P = any>(options: RepositoryOptions<P>, hashKey: string, rangeKey?: string, condition?: FilterCondition): Promise<boolean> {
    const params: any = {
      TableName: `${options.tableName}`,
      Key: options.rangeKey
        ? {
          [options.hashKey.sourceKey]: toDynamo(hashKey),
          [options.rangeKey.sourceKey]: toDynamo(rangeKey),
        }
        : {
          [options.hashKey.sourceKey]: toDynamo(hashKey),
        },
    }

    if (condition) {
      const builder = new ExpressionBuilder()
      params.ConditionExpression = condition.build(builder)
      const names = builder.getNames()
      const values = builder.getValues()
      if (Object.keys(names).length > 0) {
        params.ExpressionAttributeNames = names
      }
      if (Object.keys(values).length > 0) {
        params.ExpressionAttributeValues = values
      }
    }

    await this.client.send(new DeleteItemCommand(params))
    return true
  }

  public async deleteManyItems<P = any>(options: RepositoryOptions<P>, cursors: DynamoCursor[]): Promise<boolean[]> {
    if (cursors.length === 0) {
      return []
    }

    const result = await this.client.send(new BatchWriteItemCommand({
      RequestItems: {
        [`${options.tableName}`]: cursors.map(({ hash, range }): WriteRequest => {
          return {
            DeleteRequest: {
              Key: options.rangeKey
                ? {
                  [options.hashKey.sourceKey]: toDynamo(hash),
                  [options.rangeKey.sourceKey]: toDynamo(range),
                }
                : {
                  [options.hashKey.sourceKey]: toDynamo(hash),
                },
            },
          }
        }),
      },
    }))

    if (result.UnprocessedItems && result.UnprocessedItems[`${options.tableName}`]) {
      const failKeys = result.UnprocessedItems[`${options.tableName}`]
        .filter(({ DeleteRequest }) => DeleteRequest)
        .map(({ DeleteRequest }) => DeleteRequest!.Key!)
      return cursors.map((cursor) => {
        const foundFailKey = failKeys.find((failKey) => failKey[options.hashKey.sourceKey].S === cursor.hash && (
          !!options.rangeKey && failKey[options.rangeKey.sourceKey].S === cursor.range
          || !!options.rangeKey && failKey[options.rangeKey.sourceKey].N === cursor.range
        ))
        return !foundFailKey
      })
    }
    return cursors.map(() => true)
  }

  public async transactWrite(items: TransactWriteItem[]): Promise<void> {
    if (items.length > 100) {
      throw new Error('TransactWriteItems supports a maximum of 100 items.')
    }
    await this.client.send(new TransactWriteItemsCommand({
      TransactItems: items,
    }))
  }

  public async transactGet(items: TransactGetItem[]): Promise<Record<string, any>[]> {
    if (items.length > 100) {
      throw new Error('TransactGetItems supports a maximum of 100 items.')
    }
    const result = await this.client.send(new TransactGetItemsCommand({
      TransactItems: items,
    }))
    return (result.Responses || []).map(r => r.Item ? fromDynamoMap(r.Item) : null).filter(Boolean) as Record<string, any>[]
  }

}
