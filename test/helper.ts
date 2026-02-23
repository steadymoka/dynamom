import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBClient,
  ListTablesCommand,
  DeleteTableCommand,
  CreateTableCommand,
} from '@aws-sdk/client-dynamodb'
import { Connection } from '../lib/connection/connection'

export async function getSafeConnection(tableName: string) {
  const ddb: DynamoDBClient = await global.createDynamoClient()
  const { TableNames } = await ddb.send(new ListTablesCommand({}))
  const tableNames = TableNames ?? []
  if (tableNames.includes(tableName)) {
    await ddb.send(new DeleteTableCommand({ TableName: tableName }))
  }
  try {
    if (tableName == 'users') { await createUserTable(ddb) }
    if (tableName == 'categories') { await createCategoryTable(ddb) }
    if (tableName == 'comments') { await createCommentTable(ddb) }
    if (tableName == 'posts') { await createPostTable(ddb) }
    if (tableName == 'movies') { await createMovieTable(ddb) }
  }
  catch(e) {
    console.error(e)
    throw e
  }
  return new Connection(ddb)
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function createSequential<T>(count: number, factory: () => Promise<T>): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < count; i++) {
    await delay(10)
    results.push(await factory())
  }
  return results
}

export function encodeBase64(cursor: Record<string, AttributeValue>): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

async function createUserTable(ddb: DynamoDBClient) {
  return ddb.send(new CreateTableCommand({
    TableName: 'users',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'username', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }))
}

async function createCategoryTable(ddb: DynamoDBClient) {
  return ddb.send(new CreateTableCommand({
    TableName: 'categories',
    KeySchema: [
      { AttributeName: 'hashKey', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'hashKey', AttributeType: 'N' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }))
}

async function createCommentTable(ddb: DynamoDBClient) {
  return ddb.send(new CreateTableCommand({
    TableName: 'comments',
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'type', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'N' },
      { AttributeName: 'type', AttributeType: 'N' },
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }))
}

async function createPostTable(ddb: DynamoDBClient) {
  return ddb.send(new CreateTableCommand({
    TableName: 'posts',
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'index__user_id__id',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'id', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
      },
    ],
  }))
}

async function createMovieTable(ddb: DynamoDBClient) {
  return ddb.send(new CreateTableCommand({
    TableName: 'movies',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'create_at', AttributeType: 'N' },
      { AttributeName: 'index_key', AttributeType: 'S' },
      { AttributeName: 'user_id__title', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'index__user_id__created_at',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'create_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'index__index_key__user_id__title',
        KeySchema: [
          { AttributeName: 'index_key', KeyType: 'HASH' },
          { AttributeName: 'user_id__title', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
      },
    ],
  }))
}
