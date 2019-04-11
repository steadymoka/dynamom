import { DynamoDB } from "aws-sdk"
import { exec } from "child_process"
import { Connection } from "../lib/connection/connection"

export async function getSafeConnection(table: string) {
  const ddb = await getDynamoClient()
  await ddb.deleteTable({ TableName: table }).promise()

  const connection = new Connection(ddb, {table})
  await connection.initialize({
    BillingMode: "PAY_PER_REQUEST",
  })
  return connection
}

export async function getDynamoClient() {
  return new DynamoDB({
    endpoint: `http://localhost:${await getDockerComposePort("dynamodb", 8000)}`,
    credentials: {
      accessKeyId: "accesskey",
      secretAccessKey: "secret",
    },
    region: "ap-northeast-2",
  })
}

export function getDockerComposePort(service: string, port: number): Promise<number> {
  let cachedPort: number | undefined
  if (cachedPort) {
    return Promise.resolve(cachedPort)
  }
  return new Promise((resolve, reject) => {
    exec(`docker-compose port ${service} ${port}`, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      const result = stdout.trim().split(":")
      cachedPort = parseInt(result[1], 10)
      resolve(cachedPort)
    })
  })
}

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
