import { DynamoDB } from "aws-sdk"
import { BillingMode, ProvisionedThroughput } from "aws-sdk/clients/dynamodb"
import { ConnectionOptions } from "../interfaces/connection"
import { fromDynamoAttributeMap } from "./from-dynamo-attribute"
import { toDynamoAttributeMap } from "./to-dynamo-attribute"


export class Connection {
  
  public options: {
    table: string
    hashKey: string
    rangeKey: string
  }

  public constructor(public client: DynamoDB, options: ConnectionOptions) {
    this.options = {
      table: options.table,
      hashKey: options.hashKey || "hashid",
      rangeKey: options.rangeKey || "rangeid",
    }
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

  public getItem(hashKey: string, rangeKey?: string): Promise<any | null> {
    return new Promise((resolve, reject) => this.client.getItem({
      TableName: this.options.table,
      Key: rangeKey ? {
        [this.options.hashKey]: {S: hashKey},
        [this.options.rangeKey]: {S: rangeKey},
      } : {
        [this.options.hashKey]: {S: hashKey},
      },
    }, (err, data) => {
      if (err) {
        return reject(err)
      }
      if (data && data.Item) {
        resolve(fromDynamoAttributeMap(data.Item))
      }
      resolve(null)
    }))
  }

  public deleteItem(hashKey: string, rangeKey?: string): Promise<void> {
    return new Promise((resolve, reject) => this.client.deleteItem({
      TableName: this.options.table,
      Key: rangeKey ? {
        [this.options.hashKey]: {S: hashKey},
        [this.options.rangeKey]: {S: rangeKey},
      } : {
        [this.options.hashKey]: {S: hashKey},
      },
    }, (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve()
    }))
  }

  public writeItems(rows: {hashKey: string, rangeKey: string, item: any}[] = []) {
    return this.client.batchWriteItem({
      RequestItems: {
        [this.options.table]: [
          ...rows.map(({hashKey, rangeKey, item}) => {
            if (typeof item[this.options.hashKey] !== "undefined" && item[this.options.hashKey] !== hashKey) {
              throw new Error(`duplicate with hashKey`)
            }
            if (typeof item[this.options.rangeKey] !== "undefined" && item[this.options.rangeKey] !== rangeKey) {
              throw new Error(`duplicate with rangeKey`)
            }
            return {
              PutRequest: {
                Item: {
                  [this.options.hashKey]: {
                    S: hashKey,
                  },
                  [this.options.rangeKey]: {
                    S: rangeKey,
                  },
                  ...toDynamoAttributeMap(item),
                },
              }
            }
          }),
        ]
      }
    }).promise()
  }
}
