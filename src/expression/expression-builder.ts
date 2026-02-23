import type { AttributeValue } from '@aws-sdk/client-dynamodb'

import { toDynamo } from '../connection/transformer'

export class ExpressionBuilder {

  private nameCounter = 0
  private valueCounter = 0
  private names: Record<string, string> = {}
  private values: Record<string, AttributeValue> = {}

  addName(attr: string): string {
    const placeholder = `#a${this.nameCounter++}`
    this.names[placeholder] = attr
    return placeholder
  }

  addValue(val: string | number | boolean | null): string {
    const placeholder = `:v${this.valueCounter++}`
    this.values[placeholder] = toDynamo(val)
    return placeholder
  }

  getNames(): Record<string, string> {
    return this.names
  }

  getValues(): Record<string, AttributeValue> {
    return this.values
  }

}
