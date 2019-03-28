import { Connection } from "../../lib/connection/connection"
import { getDynamoClient, getSafeConnection } from "../helper"


describe("testsuite of connection/connection", () => {
  it("test initialize and doctor", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table: "dynamo1"})

    await connection.initialize({
      BillingMode: "PAY_PER_REQUEST",
    })

    await connection.doctor()
  })


  it("test getItem", async () => {
    const connection = await getSafeConnection("dynamo1")

    expect(await connection.getItem("test-connection", "1")).toEqual(null)

    await connection.client.putItem({
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

    await connection.client.deleteItem({
      TableName: "dynamo1",
      Key: {hashid: {S: "test-connection"}, rangeid: {S: "1"}},
    }).promise()
  })


  it("test count", async () => {
    const connection = await getSafeConnection("dynamo1")

    expect(await connection.count("test-connection")).toEqual(0)

    for (let i = 0; i < 10; i++) {
      await connection.client.putItem({
        TableName: "dynamo1",
        Item: {
          hashid: {S: "test-connection"},
          rangeid: {S: `${i}`},
          othervalue: {S: "this is test getItem"},
        },
      }).promise()
    }

    expect(await connection.count("test-connection")).toEqual(10)

    for (let i = 0; i < 10; i++) {
      await connection.client.deleteItem({
        TableName: "dynamo1",
        Key: {hashid: {S: "test-connection"}, rangeid: {S: `${i}`}},
      }).promise()
    }
  })


  it("test query", async () => {
    const connection = await getSafeConnection("dynamo1")

    for (let i = 0; i < 10; i++) {
      await connection.client.putItem({
        TableName: "dynamo1",
        Item: {
          hashid: {S: "test-connection"},
          rangeid: {S: `${i}`},
          othervalue: {S: "this is test getItem"},
        },
      }).promise()
    }

    const result1 = await connection.query("test-connection", {limit: 5})
    expect(result1).toEqual({
      nodes: [
        {
          cursor: {hashKey: "test-connection", rangeKey: "0"},
          node: {
            hashid: "test-connection",
            rangeid: "0",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "1"},
          node: {
            hashid: "test-connection",
            rangeid: "1",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "2"},
          node: {
            hashid: "test-connection",
            rangeid: "2",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "3"},
          node: {
            hashid: "test-connection",
            rangeid: "3",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "4"},
          node: {
            hashid: "test-connection",
            rangeid: "4",
            othervalue: "this is test getItem"
          }
        }
      ],
      endCursor: {hashKey: "test-connection", rangeKey: "4"},
    })
    const result2 = await connection.query("test-connection", {after: result1.endCursor})
    expect(result2).toEqual({
      nodes: [
        {
          cursor: {hashKey: "test-connection", rangeKey: "5"},
          node: {
            hashid: "test-connection",
            rangeid: "5",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "6"},
          node: {
            hashid: "test-connection",
            rangeid: "6",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "7"},
          node: {
            hashid: "test-connection",
            rangeid: "7",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "8"},
          node: {
            hashid: "test-connection",
            rangeid: "8",
            othervalue: "this is test getItem"
          }
        },
        {
          cursor: {hashKey: "test-connection", rangeKey: "9"},
          node: {
            hashid: "test-connection",
            rangeid: "9",
            othervalue: "this is test getItem"
          }
        }
      ],
    })

    for (let i = 0; i < 10; i++) {
      await connection.client.deleteItem({
        TableName: "dynamo1",
        Key: {hashid: {S: "test-connection"}, rangeid: {S: `${i}`}},
      }).promise()
    }
  })


  it("test deleteItem", async () => {
    const connection = await getSafeConnection("dynamo1")

    await connection.client.putItem({
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

    expect(await connection.deleteItem("test-connection", "2")).toBeTruthy()

    expect(await connection.getItem("test-connection", "2")).toEqual(null)
  })


  it("test putItems", async () => {
    const connection = await getSafeConnection("dynamo1")

    try {
      await connection.putItems([{
        cursor: {
          hashKey: "users",
          rangeKey: "1",
        },
        node: {
          hashid: "hello world1",
        },
      }])
      fail("throw")
    } catch (e) {
      expect(e).toEqual(new Error("duplicate with hashKey"))
    }
    try {
      await connection.putItems([{
        cursor: {
          hashKey: "users",
          rangeKey: "1",
        },
        node: {
          rangeid: "hello world1",
        },
      }])
      fail("throw")
    } catch (e) {
      expect(e).toEqual(new Error("duplicate with rangeKey"))
    }

    expect(await connection.putItems([])).toEqual([])
    expect(await connection.putItems([{
      cursor: {
        hashKey: "users",
        rangeKey: "3",
      },
      node: {
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
    }])).toEqual([true])

    expect(await connection.putItems([{
      cursor: {
        hashKey: "users",
        rangeKey: "4",
      },
      node: {
        title: "this is test putItems"
      },
    }])).toEqual([true])

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

  it("test getManyItems", async () => {
    const connection = await getSafeConnection("dynamo1")

    expect(await connection.getManyItems([])).toEqual([])

    expect(await connection.getManyItems([
      {hashKey: "test-connection", rangeKey: "1"},
      {hashKey: "test-connection", rangeKey: "2"},
      {hashKey: "test-connection", rangeKey: "3"},
    ])).toEqual([])

    await connection.putItems([
      {cursor: {hashKey: "test-connection", rangeKey: "1"}, node: {title: "item 1"}},
      {cursor: {hashKey: "test-connection", rangeKey: "2"}, node: {title: "item 2"}},
      {cursor: {hashKey: "test-connection", rangeKey: "3"}, node: {title: "item 3"}},
    ])

    const result = await connection.getManyItems([
      {hashKey: "test-connection", rangeKey: "1"},
      {hashKey: "test-connection", rangeKey: "2"},
      {hashKey: "test-connection", rangeKey: "3"},
    ])
    expect(result.sort((a, b) => a.rangeid > b.rangeid ? 1 : -1)).toEqual([
      {hashid: "test-connection", rangeid: "1", title: "item 1"},
      {hashid: "test-connection", rangeid: "2", title: "item 2"},
      {hashid: "test-connection", rangeid: "3", title: "item 3"},
    ])

    await Promise.all([
      connection.deleteItem("test-connection", "1"),
      connection.deleteItem("test-connection", "2"),
      connection.deleteItem("test-connection", "3"),
    ])
  })

  it("test deleteManyItems", async () => {
    const connection = await getSafeConnection("dynamo1")

    await connection.putItems([
      {cursor: {hashKey: "test-connection", rangeKey: "1"}, node: {title: "item 1"}},
      {cursor: {hashKey: "test-connection", rangeKey: "2"}, node: {title: "item 2"}},
      {cursor: {hashKey: "test-connection", rangeKey: "3"}, node: {title: "item 3"}},
    ])

    expect(await connection.deleteManyItems([])).toEqual([])

    expect(await connection.deleteManyItems([
      {hashKey: "test-connection", rangeKey: "1"},
      {hashKey: "test-connection", rangeKey: "2"},
      {hashKey: "test-connection", rangeKey: "3"},
    ])).toEqual([true, true, true])

    expect(await connection.getManyItems([
      {hashKey: "test-connection", rangeKey: "1"},
      {hashKey: "test-connection", rangeKey: "2"},
      {hashKey: "test-connection", rangeKey: "3"},
    ])).toEqual([])
  })
})
