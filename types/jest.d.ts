import { DynamoDB } from 'aws-sdk'

declare global {
  namespace NodeJS {
    interface Global {
      createDynamoClient(): Promise<DynamoDB>
    }
  }
}
