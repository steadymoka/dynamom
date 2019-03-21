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


  it("test getItem and writeItems", async () => {
    const ddb = new DynamoDB({
      endpoint: `http://localhost:${await getDockerComposePort("dynamodb", 8000)}`,
      region: "ap-northeast-2",
    })
    const connection = new Connection(ddb, {
      table: "dynamo1",
      hashKey: "hashid",
      rangeKey: "rangeid",
    })

    expect(() => connection.writeItems([{
      hashKey: "users",
      rangeKey: "1",
      item: {
        hashid: "hello world1",
      },
    }])).toThrowError(new Error("duplicate with hashKey"))
    expect(() => connection.writeItems([{
      hashKey: "users",
      rangeKey: "1",
      item: {
        rangeid: "hello world1",
      },
    }])).toThrowError(new Error("duplicate with rangeKey"))

    await connection.writeItems([{
      hashKey: "users",
      rangeKey: "1",
      item: {
        value_empty_string: "",
        value_null: null,
        value_number: 30.333,
        value_string: "this is string",
        value_false: false,
        value_true: true,
        value_list: ["", null, 3.14, "string", false, true],
        value_obj: {
          foo: "foo string"
        },
      },
    }])

    expect(await connection.getItem("users", "1")).toEqual({
      hashid: "users",
      rangeid: "1",
      value_empty_string: null,
      value_null: null,
      value_number: 30.333,
      value_string: "this is string",
      value_false: false,
      value_true: true,
      value_list: [null, null, 3.14, "string", false, true],
      value_obj: {
        foo: "foo string"
      },
    })

    await ddb.deleteItem({
      TableName: "dynamo1",
      Key: {hashid: {S: "users"}, rangeid: {S: "1"}},
    }).promise()
  })
})
