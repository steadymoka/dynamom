import { DynamoDB } from "aws-sdk"
import { BillingMode, ProvisionedThroughput } from "aws-sdk/clients/dynamodb"
import { ConnectionOptions } from "../interfaces/connection"


export class Connection {
  
  public constructor(public client: DynamoDB, public options: ConnectionOptions) {
  }

  public async initialize(mode: {BillingMode?: BillingMode, ProvisionedThroughput?: ProvisionedThroughput}) {
    const listTables = await this.client.listTables().promise()
    const tableNames = listTables.TableNames || []
    if (tableNames.indexOf(this.options.table) === -1) {
      await this.client.createTable({
        TableName: this.options.table,
        KeySchema: [
          {
            AttributeName: this.options.hashKey,
            KeyType: "HASH",

          },
          {
            AttributeName: this.options.rangeKey,
            KeyType: "RANGE", 
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: this.options.hashKey,
            AttributeType: "S",
          },
          {
            AttributeName: this.options.rangeKey,
            AttributeType: "S",
          },
        ],
        ...mode,
      }).promise()
    }
  }

  public async doctor() {
    const description = await this.client.describeTable({
      TableName: this.options.table,
    }).promise()
    if (description && description.Table) {
      const keySchema = description.Table.KeySchema || []
      if (keySchema.length !== 2) {
        throw new Error("need two keys(hash, range).")
      }
      if (keySchema[0].AttributeName !== this.options.hashKey) {
        throw new Error(`hash key name must be ${this.options.hashKey}. current hash key is ${keySchema[0].AttributeName}.`)
      }
      if (keySchema[1].AttributeName !== this.options.rangeKey) {
        throw new Error(`range key name must be ${this.options.rangeKey}. current range key is ${keySchema[1].AttributeName}.`)
      }
      return description
    }
    throw new Error(`table(${this.options.table}) not found.`)
  }
}
