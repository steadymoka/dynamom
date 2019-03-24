import { DynamoDB } from "aws-sdk"
import { exec } from "child_process"
import { Connection } from "../src/connection/connection"

export async function getSafeConnection(table: string) {
  const ddb = await getDynamoClient()
  const connection = new Connection(ddb, {table})
  await connection.initialize({
    BillingMode: "PAY_PER_REQUEST",
  })
  return connection
}

export async function getDynamoClient() {
  return new DynamoDB({
    endpoint: `http://localhost:${await getDockerComposePort("dynamodb", 8000)}`,
    region: "ap-northeast-2",
  })
}

export function getDockerComposePort(service: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    exec(`docker-compose port ${service} ${port}`, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      const result = stdout.trim().split(":")
      resolve(parseInt(result[1], 10))
    })
  })
}

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
