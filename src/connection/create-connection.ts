import { DynamoDB } from "aws-sdk"
import { ConnectionOptions } from "../interfaces/connection"
import { Connection } from "./connection"


export interface CreateOptions extends ConnectionOptions {
  dynamodb?: DynamoDB.Types.ClientConfiguration
}

export function createConnection(options: CreateOptions): Connection {
  const ddb = new DynamoDB(options.dynamodb)
  return new Connection(ddb, options)
}
