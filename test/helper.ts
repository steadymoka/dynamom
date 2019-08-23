import { DynamoDB } from "aws-sdk"
import { exec } from "child_process"
import { Connection } from "../lib/connection/connection"

export async function getSafeConnection(tableName: string) {
  const ddb = await getDynamoClient()
  try { await ddb.deleteTable({ TableName: tableName }).promise() } catch (e) { }  
  try {
    if (tableName == "users") { await createUserTable(ddb) }
    if (tableName == "categories") { await createCategoryTable(ddb) }
    if (tableName == "comments") { await createCommentTable(ddb) }
    if (tableName == "posts") { await createPostTable(ddb) }
    if (tableName == "movies") { await createMovieTable(ddb) }
  }
  catch(e) {
    console.log(e)
  }
  return new Connection(ddb)
}

async function createUserTable(ddb: DynamoDB): Promise<any> {
  await ddb.createTable({
    TableName: "users",
    KeySchema: [
      { AttributeName: "user_id", KeyType: "HASH" },
      { AttributeName: "username", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "username", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST"
  }).promise()
  return Promise.resolve(true)
}

async function createCategoryTable(ddb: DynamoDB): Promise<any> {
  await ddb.createTable({
    TableName: "categories",
    KeySchema: [
      { AttributeName: "hashKey", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "hashKey", AttributeType: "N" },
      { AttributeName: "id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST"
  }).promise()
  return Promise.resolve(true)
}

async function createCommentTable(ddb: DynamoDB): Promise<any> {
  await ddb.createTable({
    TableName: "comments",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "type", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "N" },
      { AttributeName: "type", AttributeType: "N" },
    ],
    BillingMode: "PAY_PER_REQUEST"
  }).promise()
  return Promise.resolve(true)
}

async function createPostTable(ddb: DynamoDB): Promise<any> {
  await ddb.createTable({
    TableName: "posts",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "index__user_id__id",
        KeySchema: [
          { AttributeName: 'user_id', KeyType: "HASH" },
          { AttributeName: 'id', KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" }
      },
    ],
  }).promise()
  return Promise.resolve(true)
}

async function createMovieTable(ddb: DynamoDB): Promise<any> {
  await ddb.createTable({
    TableName: "movies",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "create_at", AttributeType: "N" },
      { AttributeName: "index_key", AttributeType: "S" },
      { AttributeName: "user_id__title", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "index__user_id__created_at",
        KeySchema: [
          { AttributeName: 'user_id', KeyType: "HASH" },
          { AttributeName: 'create_at', KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "index__index_key__user_id__title",
        KeySchema: [
          { AttributeName: 'index_key', KeyType: "HASH" },
          { AttributeName: 'user_id__title', KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" }
      },
    ],
  }).promise()
  return Promise.resolve(true)
}

export async function getDynamoClient() {
  return new DynamoDB({
    endpoint: `http://localhost:${await getDockerComposePort("dynamodb", 8000)}`,
    credentials: {
      accessKeyId: "accesskey",
      secretAccessKey: "secret",
    },
    region: "ap-northeast-2",
  })
}

export function getDockerComposePort(service: string, port: number): Promise<number> {
  let cachedPort: number | undefined
  if (cachedPort) {
    return Promise.resolve(cachedPort)
  }
  return new Promise((resolve, reject) => {
    exec(`docker-compose port ${service} ${port}`, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      const result = stdout.trim().split(":")
      cachedPort = parseInt(result[1], 10)
      resolve(cachedPort)
    })
  })
}

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
