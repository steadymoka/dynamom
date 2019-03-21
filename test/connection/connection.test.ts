import { DynamoDB } from "aws-sdk"
import { getDockerComposePort } from "../helper"
import { Connection } from "../../src/connection/connection"

describe("testsuite of connection/connection", () => {
  it("test initialize and doctor", async () => {
    const ddb = new DynamoDB({
      endpoint: `http://localhost:${await getDockerComposePort("dynamodb", 8000)}`,
      region: "ap-northeast-2",
    })

    const connection = new Connection(ddb, {
      table: "dynamo1",
      hashKey: "hashid",
      rangeKey: "rangeid",
    })

    await connection.initialize({
      BillingMode: "PAY_PER_REQUEST",
    })
    await connection.doctor()
  })
})
