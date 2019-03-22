import { getDynamoClient } from "../helper"
import { Connection } from "../../src/connection/connection"


describe("testsuite of connection/connection", () => {
  it("test initialize and doctor", async () => {
    const ddb = await getDynamoClient()
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


  it("test getItem", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table: "dynamo1"})

    expect(await connection.getItem("test-connection", "1")).toEqual(null)

    await ddb.putItem({
      TableName: "dynamo1",
      Item: {
        hashid: {S: "test-connection"},
        rangeid: {S: "1"},
        othervalue: {S: "this is test getItem"},
      },
    }).promise()

    expect(await connection.getItem("test-connection", "1")).toEqual({
      hashid: "test-connection",
      rangeid: "1",
      othervalue: "this is test getItem",
    })

    await ddb.deleteItem({
      TableName: "dynamo1",
      Key: {hashid: {S: "test-connection"}, rangeid: {S: "1"}},
    }).promise()
  })


  it("test deleteItem", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table: "dynamo1"})

    await ddb.putItem({
      TableName: "dynamo1",
      Item: {
        hashid: {S: "test-connection"},
        rangeid: {S: "2"},
        othervalue: {S: "this is test deleteItem"},
      },
    }).promise()
    
    expect(await connection.getItem("test-connection", "2")).toEqual({
      hashid: "test-connection",
      rangeid: "2",
      othervalue: "this is test deleteItem",
    })

    await connection.deleteItem("test-connection", "2")

    expect(await connection.getItem("test-connection", "2")).toEqual(null)
  })


  it("test putItems", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table: "dynamo1"})

    expect(() => connection.putItems([{
      hashKey: "users",
      rangeKey: "1",
      item: {
        hashid: "hello world1",
      },
    }])).toThrowError(new Error("duplicate with hashKey"))
    expect(() => connection.putItems([{
      hashKey: "users",
      rangeKey: "1",
      item: {
        rangeid: "hello world1",
      },
    }])).toThrowError(new Error("duplicate with rangeKey"))

    await connection.putItems([{
      hashKey: "users",
      rangeKey: "3",
      item: {
        hashid: "users",
        rangeid: "3",
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

    await connection.putItems([{
      hashKey: "users",
      rangeKey: "4",
      item: {
        title: "this is test putItems"
      },
    }])

    expect(await connection.getItem("users", "3")).toEqual({
      hashid: "users",
      rangeid: "3",
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
    expect(await connection.getItem("users", "4")).toEqual({
      hashid: "users",
      rangeid: "4",
      title: "this is test putItems",
    })

    await connection.deleteItem("users", "1")
  })
})
