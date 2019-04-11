import faker from "faker"

import { DynamoCursor } from "../../lib"
import { createOptions } from "../../lib/repository/create-options"
import { Repository } from "../../lib/repository/repository"
import { getSafeConnection } from "../helper"
import { User } from "../stubs/user"


const TableName = "dynamo1_service" 
const range = (start: number, end: number) => Array.from({length: (end - start)}, (_, k) => k + start)

function encodeBase64(cursor: DynamoCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64")
}

function createFakeUser() {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    createdAt: new Date().getTime(),
    type: faker.random.word()
  }
}

describe("testsuite of repository/repository", () => {
  it("test create", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    expect(user).toEqual({
      id: user.id, // :-)
      username: fakeUser.username,
      email: fakeUser.email,
      type: fakeUser.type,
      createdAt: fakeUser.createdAt,
    })
    expect(user).toBeInstanceOf(User)


    expect(await connection.getItem("user", user.id)).toEqual({
      hashid: "user",
      rangeid: user.id, // generated uuid
      user_id: user.id,
      email: fakeUser.email,
      type: fakeUser.type,
      username: fakeUser.username,
      created_at: fakeUser.createdAt,
    })
    expect(await connection.getItem("user__created", `${fakeUser.createdAt}__${user.id}`)).toEqual({
      hashid: "user__created",
      rangeid: `${fakeUser.createdAt}__${user.id}`,
      sourcetype: "user",
      sourceid: user.id, // generated uuid
    })

    await connection.deleteManyItems([
      {hashKey: "user", rangeKey: user.id},
      {hashKey: "user__created", rangeKey: `${fakeUser.createdAt}__${user.id}`},
    ])
  })


  it("test find", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)
    const foundUser = await repository.find(user.id)

    expect(user).toEqual(foundUser)
    expect(foundUser).toEqual({
      id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type: fakeUser.type,
      createdAt: fakeUser.createdAt,
    })
    expect(foundUser).toBeInstanceOf(User)


    await connection.deleteManyItems([
      {hashKey: "user", rangeKey: user.id},
      {hashKey: "user__created", rangeKey: `${fakeUser.createdAt}__${user.id}`},
    ])
  })


  it("test remove", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    expect(await repository.find(user.id)).toEqual(user) // exists

    // exists!
    expect(await connection.getItem("user", user.id)).not.toEqual(null)
    expect(await connection.getItem("user__created", `${fakeUser.createdAt}__${user.id}`)).not.toEqual(null)
    

    expect(await repository.remove(user)).toBeUndefined() // return void

    // not exists!
    expect(await connection.getItem("user", user.id)).toEqual(null)
    expect(await connection.getItem("user__created", `${fakeUser.createdAt}__${user.id}`)).toEqual(null)
  })
  

  it("test retrieve", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))

    // clean
    // await Promise.all((await repository.retrieve({limit: 100})).nodes.map(node => repository.remove(node.node)))

    const users = await Promise.all(range(0, 20).map(() => repository.create(createFakeUser())))

    const result1 = await repository.retrieve({limit: 5})
    const result2 = await repository.retrieve({after: result1.endCursor})

    // all delete
    await Promise.all(users.map(user => repository.remove(user)))

    const sortedUsers = users.sort((a, b) => a.id > b.id ? 1 : -1)
    expect(result1).toEqual({
      nodes: sortedUsers.slice(0, 5).map(user => ({
        cursor: encodeBase64({hashKey: "user", rangeKey: user.id}),
        node: user,
      })),
      endCursor: encodeBase64({hashKey: "user", rangeKey: sortedUsers[4].id}),
    })
    expect(result2).toEqual({
      nodes: sortedUsers.slice(5).map(user => ({
        cursor: encodeBase64({hashKey: "user", rangeKey: user.id}),
        node: user,
      })),
    })
  })


  it("test retrieve by index", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))

    // clean
    // await Promise.all((await repository.retrieve({limit: 100})).nodes.map(node => repository.remove(node.node)))

    const users = await Promise.all(range(0, 10).map(() => repository.create(createFakeUser())))

    const result1 = await repository.retrieve({limit: 5, index: "created", desc: true})
    const result2 = await repository.retrieve({after: result1.endCursor, index: "created", desc: true})

    // all delete
    await Promise.all(users.map(user => repository.remove(user)))

    const sortedUsers = users.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    expect(result1).toEqual({
      nodes: sortedUsers.slice(0, 5).map(user => ({
        cursor: encodeBase64({hashKey: "user__created", rangeKey: `${user.createdAt}__${user.id}`}),
        node: user,
      })),
      endCursor: encodeBase64({hashKey: "user__created", rangeKey: `${sortedUsers[4].createdAt}__${sortedUsers[4].id}`}),
    })
    expect(result2).toEqual({
      nodes: sortedUsers.slice(5).map(user => ({
        cursor: encodeBase64({hashKey: "user__created", rangeKey: `${user.createdAt}__${user.id}`}),
        node: user,
      })),
    })
  })


  it("test retrieve by filter", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))

    const users = await Promise.all(range(0, 10).map(() => repository.create(createFakeUser())))
    const filter = users[0].type

    const result1 = await repository.retrieve({limit: 10, index: "type", desc: true, filter})

    // all delete
    await Promise.all(users.map(user => repository.remove(user)))

    expect(result1).toEqual({
      nodes: users.filter(it => { return it.type == filter }).map(user => ({
        cursor: encodeBase64({hashKey: "user__type", rangeKey: `${user.type}__${user.id}`}),
        node: user,
      })),
    })
  })


  it("test persist(update)", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))

    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)
    user.email = "corgidisco+updated@gmail.com"

    expect(await repository.persist(user)).toBeUndefined() // return void

    const foundUser = (await repository.find(user.id))!

    expect(foundUser.email).toEqual("corgidisco+updated@gmail.com")
    expect(foundUser).toEqual(user)

    await repository.remove(user)
  })
})
