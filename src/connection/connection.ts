import { DynamoDB } from "aws-sdk"
import { BillingMode, ProvisionedThroughput } from "aws-sdk/clients/dynamodb"
import {
  ConnectionOptions,
  DynamoNode,
  QueryOptions,
  QueryResult
} from "../interfaces/connection"
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

  public query<P = any>(hashKey: string, {limit = 20, after}: QueryOptions = {}): Promise<QueryResult<P>> {
    return new Promise((resolve, reject) => this.client.query({
      TableName: this.options.table,
      Limit: limit,
      KeyConditionExpression: `#hashkey = :hashkey`,
      ExpressionAttributeNames: {
        "#hashkey": this.options.hashKey,
      },
      ExpressionAttributeValues: {
        ":hashkey": {S: hashKey},
      },
      ExclusiveStartKey: after ? {
        [this.options.hashKey]: {S: after.hashKey},
        [this.options.rangeKey]: {S: after.rangeKey},
      } : undefined,
    }, (err, result) => {
      if (err) {
        return reject(err)
      }
      const nodes: DynamoNode<P>[] = (result.Items || []).map((item) => {
        const node = fromDynamoAttributeMap(item) as P
        return {
          cursor: {
            hashKey: item[this.options.hashKey].S as string,
            rangeKey: item[this.options.rangeKey].S as string,
          },
          node,
        }
      })

      if (result.LastEvaluatedKey) {
        const lastCursor = fromDynamoAttributeMap(result.LastEvaluatedKey)
        return resolve({
          nodes,
          endCursor: {
            hashKey: lastCursor[this.options.hashKey] as string,
            rangeKey: lastCursor[this.options.rangeKey] as string,
          },
        })
      }
      resolve({
        nodes,
      })
    }))
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

  public count(hashKey: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.query({
        TableName: this.options.table,
        Select: "COUNT",
        KeyConditionExpression: `#hashkey = :hashkey`,
        ExpressionAttributeNames: {
          "#hashkey": this.options.hashKey,
        },
        ExpressionAttributeValues: {
          ":hashkey": {S: hashKey},
        },
      }, (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result.Count || 0)
      })
    })
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
    }, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    }))
  }

  public putItems<P = any>(rows: DynamoNode<P>[] = []) {
    return this.client.batchWriteItem({
      RequestItems: {
        [this.options.table]: [
          ...rows.map(({cursor: {hashKey, rangeKey}, node}) => {
            if (typeof (node as any)[this.options.hashKey] !== "undefined"
              && (node as any)[this.options.hashKey] !== hashKey) {
              throw new Error(`duplicate with hashKey`)
            }
            if (typeof (node as any)[this.options.rangeKey] !== "undefined"
              && (node as any)[this.options.rangeKey] !== rangeKey) {
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
                  ...toDynamoAttributeMap(node),
                },
              }
            }
          }),
        ]
      }
    }).promise()
  }
}
