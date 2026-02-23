import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  BatchGetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb'
import type { WriteRequest } from '@aws-sdk/client-dynamodb'

import { ConstructType } from '../interfaces/common'
import { DynamoCursor, DynamoNode, QueryOptions, QueryResult } from '../interfaces/connection'
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

  public async putItem<P = any>(options: RepositoryOptions<P>, row: DynamoNode<P>): Promise<boolean> {
    await this.client.send(new PutItemCommand({
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
    }))
    return true
  }

  public async updateItem<P = any>(options: RepositoryOptions<P>, row: DynamoNode<P>): Promise<boolean> {
    const hashKey = options.hashKey.sourceKey
    const rangeKey = options.rangeKey ? options.rangeKey.sourceKey : undefined
    const keys = Object.keys(row.node as Record<string, any>).filter((key) => key != hashKey && key != rangeKey)

    await this.client.send(new UpdateItemCommand({
      TableName: options.tableName,
      Key: rangeKey
        ? {
          [`${hashKey}`]: toDynamo(row.cursor.hash),
          [`${rangeKey}`]: toDynamo(row.cursor.range),
        }
        : {
          [`${hashKey}`]: toDynamo(row.cursor.hash),
        },
      UpdateExpression: `SET ${keys.map(key => `#${key} = :${key}`).join(', ')}`,
      ExpressionAttributeNames: keys.reduce((carry, key) => {
        carry[`#${key}`] = key
        return carry
      }, {} as any),
      ExpressionAttributeValues: keys.reduce((carry, key) => {
        carry[`:${key}`] = toDynamo((row.node as any)[key])
        return carry
      }, {} as any),
    }))
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

  public async query<P = any>(options: RepositoryOptions<P>, { indexName, hash, rangeOption, limit = 20, after, desc = false }: QueryOptions<P> = { hash: 'all' }): Promise<QueryResult<P>> {
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

    const result = await this.client.send(new QueryCommand({
      TableName: `${options.tableName}`,
      IndexName: indexName ? indexName : undefined,
      Limit: limit,
      KeyConditionExpression: rangeOption
        ? isGeneratedRangeKey == true
          ? '#hashkey = :hashkey and begins_with(#rangekey, :rangekey)'
          : `#hashkey = :hashkey and ${rangeOption.getExpression()}`
        : '#hashkey = :hashkey',
      ExpressionAttributeNames: rangeOption
        ? {
          '#hashkey': hashKey,
          '#rangekey': rangeKey!,
        }
        : {
          '#hashkey': hashKey,
        },
      ExpressionAttributeValues: rangeOption
        ? {
          ':hashkey': typeof hash === 'string'
            ? { S: hash }
            : { N: `${hash}` },
          ':rangekey': isGeneratedRangeKey
            ? { S: `${rangeOption.range}__` }
            : typeof rangeOption.range === 'string'
              ? { S: `${rangeOption.range}` }
              : { N: `${rangeOption.range}` },
        }
        : {
          ':hashkey': typeof hash === 'string'
            ? { S: hash }
            : { N: `${hash}` },
        },
      ExclusiveStartKey: after
        ? after
        : undefined,
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

  public async deleteItem<P = any>(options: RepositoryOptions<P>, hashKey: string, rangeKey?: string): Promise<boolean> {
    await this.client.send(new DeleteItemCommand({
      TableName: `${options.tableName}`,
      Key: options.rangeKey
        ? {
          [options.hashKey.sourceKey]: toDynamo(hashKey),
          [options.rangeKey.sourceKey]: toDynamo(rangeKey),
        }
        : {
          [options.hashKey.sourceKey]: toDynamo(hashKey),
        },
    }))
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

}
