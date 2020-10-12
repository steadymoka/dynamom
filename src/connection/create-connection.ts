import { DynamoDB } from 'aws-sdk'
import { Connection } from './connection'


export function createConnection(options: { dynamodb?: DynamoDB.Types.ClientConfiguration }): Connection {
  const ddb = new DynamoDB(options.dynamodb)
  return new Connection(ddb)
}
