import { Connection } from "../../src/connection/connection"
import { Repository } from "../../src/repository/repository"
import { createOptions } from "../../src/repository/create-options"
import { getDynamoClient } from "../helper"
import { User } from "../stubs/user"

const table = "dynamo1_service" 

describe("testsuite of repository/repository", () => {
  it("test create and find", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table})

    await connection.initialize({
      BillingMode: "PAY_PER_REQUEST",
    })

    const repository = new Repository(connection, createOptions(User))
    const createdAt = new Date().getTime()

    const user = await repository.create({
      username: "corgidisco",
      email: "corgidisco@gmail.com",
      createdAt,
    })
    expect(user).toEqual({
      id: user.id, // :-)
      username: "corgidisco",
      email: "corgidisco@gmail.com",
      createdAt,
    })
    expect(user).toBeInstanceOf(User)

    const foundUser = await repository.find(user.id)

    expect(user).toEqual(foundUser)
    expect(foundUser).toEqual({
      id: user.id, // :-)
      username: "corgidisco",
      email: "corgidisco@gmail.com",
      createdAt,
    })
    expect(foundUser).toBeInstanceOf(User)


    await ddb.deleteItem({
      TableName: "dynamo1_service",
      Key: {hashid: {S: "user"}, rangeid: {S: user.id}},
    }).promise()
  })

  it("test persist(update)", async () => {
    const ddb = await getDynamoClient()
    const connection = new Connection(ddb, {table})

    await connection.initialize({
      BillingMode: "PAY_PER_REQUEST",
    })

    const repository = new Repository(connection, createOptions(User))
    const createdAt = new Date().getTime()

    const user = await repository.create({
      username: "corgidisco",
      email: "corgidisco@gmail.com",
      createdAt,
    })

    user.email = "corgidisco+updated@gmail.com"

    await repository.persist(user)

    const foundUser = (await repository.find(user.id))!

    expect(foundUser.email).toEqual("corgidisco+updated@gmail.com")
    expect(user).toEqual(foundUser)

    await ddb.deleteItem({
      TableName: "dynamo1_service",
      Key: {hashid: {S: "user"}, rangeid: {S: user.id}},
    }).promise()
  })
})
