import * as faker from "faker"
import { createOptions } from "../../src/repository/create-options"
import { Repository } from "../../src/repository/repository"
import { getSafeConnection } from "../helper"
import { User } from "../stubs/user"


const TableName = "dynamo1_service" 
const range = (start: number, end: number) => Array.from({length: (end - start)}, (_, k) => k + start)

function createFakeUser() {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    createdAt: new Date().getTime(),
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
      createdAt: fakeUser.createdAt,
    })
    expect(user).toBeInstanceOf(User)


    expect(await connection.client.getItem({
      TableName,
      Key: {hashid: {S: "user"}, rangeid: {S: user.id}},
    }).promise()).toEqual({
      Item: {
        hashid: {S: "user" },
        rangeid: {S: user.id}, // generated uuid
        email: {S: fakeUser.email},
        username: {S: fakeUser.username},
        created_at: {N: `${fakeUser.createdAt}`},
      }
    })
    await connection.client.deleteItem({
      TableName,
      Key: {hashid: {S: "user"}, rangeid: {S: user.id}},
    }).promise()
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
      createdAt: fakeUser.createdAt,
    })
    expect(foundUser).toBeInstanceOf(User)


    await connection.client.deleteItem({
      TableName: "dynamo1_service",
      Key: {hashid: {S: "user"}, rangeid: {S: user.id}},
    }).promise()
  })


  it("test remove", async () => {
    const connection = await getSafeConnection(TableName)
    const repository = new Repository(connection, createOptions(User))

    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    expect(await repository.find(user.id)).toEqual(user) // exists


    expect(await repository.remove(user)).toBeUndefined() // return void

    expect(await repository.find(user.id)).toBeUndefined() // not exists!!!
  })
  
  // it("test retrieve", async () => {
  //   const connection = await getSafeConnection(table)
  //   const repository = new Repository(connection, createOptions(User))

  //   const users = await Promise.all(range(0, 20).map(() => repository.create({
  //     email: faker.internet.email(),
  //     username: faker.internet.userName(),
  //     createdAt: new Date().getTime(),
  //   })))

  //   Promise.all(users.map(user => repository.dele))
    
    
  // })


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
