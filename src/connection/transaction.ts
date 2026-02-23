import type { TransactWriteItem, TransactGetItem, AttributeValue } from '@aws-sdk/client-dynamodb'

import { toDynamo } from './transformer'

export class TransactWriter {

  public items: TransactWriteItem[] = []

  add(item: TransactWriteItem): this {
    this.items.push(item)
    return this
  }

  addPut(tableName: string, item: Record<string, AttributeValue>): this {
    this.items.push({
      Put: { TableName: tableName, Item: item },
    })
    return this
  }

  addDelete(tableName: string, key: Record<string, AttributeValue>): this {
    this.items.push({
      Delete: { TableName: tableName, Key: key },
    })
    return this
  }

  validate(): void {
    if (this.items.length > 100) {
      throw new Error('TransactWriteItems supports a maximum of 100 items.')
    }
  }
}

export class TransactReader {

  public items: TransactGetItem[] = []

  addGet(tableName: string, key: Record<string, AttributeValue>): this {
    this.items.push({
      Get: { TableName: tableName, Key: key },
    })
    return this
  }

  validate(): void {
    if (this.items.length > 100) {
      throw new Error('TransactGetItems supports a maximum of 100 items.')
    }
  }
}
