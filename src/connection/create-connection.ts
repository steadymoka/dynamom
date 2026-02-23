import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { Connection } from './connection'


export function createConnection(options: { dynamodb?: DynamoDBClientConfig }): Connection {
  const ddb = new DynamoDBClient(options.dynamodb ?? {})
  return new Connection(ddb)
}
