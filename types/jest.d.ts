import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

declare global {
  namespace NodeJS {
    interface Global {
      createDynamoClient(): Promise<DynamoDBClient>
    }
  }
  var createDynamoClient: () => Promise<DynamoDBClient>
}
