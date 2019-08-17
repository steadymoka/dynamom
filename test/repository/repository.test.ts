import faker from "faker"

import { DynamoCursor } from "../../lib"
import { createOptions } from "../../lib/repository/create-options"
import { Repository } from "../../lib/repository/repository"
import { fromDynamoAttributeMap } from "../../lib/connection/from-dynamo-attribute"
import { getSafeConnection } from "../helper"
import { User } from "../stubs/user"
import { Post } from "../stubs/post"
import { Category } from "../stubs/category"
import { Comment } from "../stubs/comment"


const range = (start: number, end: number) => Array.from({ length: (end - start) }, (_, k) => k + start)

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

function createFakePost(user_id?: string) {
  return {
    pk: "all",
    content: faker.random.word(),
    userId: user_id ? user_id : faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

function createFakeCategory() {
  return {
    pk: 1,
    title: faker.random.word(),
    userId: faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

function createFakeComment() {
  return {
    pk: 1,
    type: new Date().getTime() / 1000, 
    userId: faker.random.word(),
    content: faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

describe("testsuite of repository/repository", () => {
  it("test create", async () => {
    const connection = await getSafeConnection("users")
    const client = connection.client
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    expect(user).toEqual({
      id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type: fakeUser.type,
      createdAt: fakeUser.createdAt,
    })
    expect(user).toBeInstanceOf(User)

    const result = await client.getItem({
      TableName: "users",
      Key: {
        ["user_id"]: { S: user.id },
        ["username"]: { S: user.username },
      },
    }).promise()

    expect({
      user_id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type_tt: fakeUser.type,
      created_at: fakeUser.createdAt,
    }).toEqual(fromDynamoAttributeMap(result.Item!))
  })


  it("test find", async () => {
    const connection = await getSafeConnection("users")
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)
    const foundUser_01 = await repository.find(user.id, user.username)

    expect(foundUser_01).toEqual(user)
    expect(foundUser_01).toEqual({
      id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type: fakeUser.type,
      createdAt: fakeUser.createdAt,
    })
    expect(foundUser_01).toBeInstanceOf(User)
  })


  it("test retrieve hashKey & sortKey is all string type", async () => {
    const connection = await getSafeConnection("posts")
    const repository = new Repository(connection, createOptions(Post))

    const posts = await Promise.all(range(0, 10).map(() => repository.create(createFakePost())))
    const sortedPosts = posts.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: "all", limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: "all", after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedPosts.slice(0, 5).map(post => ({
        cursor: encodeBase64({ hashKey: "all", rangeKey: `${post.id}` }),
        node: post,
      })),
      endCursor: encodeBase64({ hashKey: "all", rangeKey: `${sortedPosts[4].id}` }),
    })

    expect(result2).toEqual({
      nodes: sortedPosts.slice(5).map(post => ({
        cursor: encodeBase64({ hashKey: "all", rangeKey: `${post.id}` }),
        node: post,
      })),
    })
  })


  it("test retrieve hashKey is number type & sortKey is string type", async () => {
    const connection = await getSafeConnection("categories")
    const repository = new Repository(connection, createOptions(Category))

    const categories = await Promise.all(range(0, 10).map(() => repository.create(createFakeCategory())))
    const sortedCategories = categories.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: 1, after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedCategories.slice(0, 5).map(category => ({
        cursor: encodeBase64({ hashKey: 1, rangeKey: `${category.id}` }),
        node: category,
      })),
      endCursor: encodeBase64({ hashKey: 1, rangeKey: `${sortedCategories[4].id}` }),
    })

    expect(result2).toEqual({
      nodes: sortedCategories.slice(5).map(category => ({
        cursor: encodeBase64({ hashKey: 1, rangeKey: `${category.id}` }),
        node: category,
      })),
    })
  })


  it("test retrieve hashKey is number type & sortKey is number type", async () => {
    const connection = await getSafeConnection("comments")
    const repository = new Repository(connection, createOptions(Comment))

    const comments = await Promise.all(range(0, 10).map(() => repository.create(createFakeComment())))
    const sortedComments = comments.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: 1, after: result1.endCursor, desc: true })
    
    expect(result1).toEqual({
      nodes: sortedComments.slice(0, 5).map(comment => ({
        cursor: encodeBase64({ hashKey: 1, rangeKey: comment.type }),
        node: comment,
      })),
      endCursor: encodeBase64({ hashKey: 1, rangeKey: sortedComments[4].type }),
    })

    expect(result2).toEqual({
      nodes: sortedComments.slice(5).map(comment => ({
        cursor: encodeBase64({ hashKey: 1, rangeKey: comment.type }),
        node: comment,
      })),
    })
  })


  it("test retrieve by index", async () => {
    const connection = await getSafeConnection("posts")
    const repository = new Repository(connection, createOptions(Post))

    const posts = await Promise.all(range(0, 10).map((i) => {
      if (i == 2 || i == 3 || i == 5) {
        return repository.create(createFakePost("moka"))
      }
      else {
        return repository.create(createFakePost())
      }
    }))
    const sortedPosts = posts.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ indexName: "index__user_id", hash: "moka", limit: 5, desc: true })
    expect(result1.nodes.length).toEqual(3)

    expect(result1).toEqual({
      nodes: [{
        cursor: encodeBase64({ hashKey: "moka", rangeKey: sortedPosts.filter((item) => item.userId == "moka")[0].id }),
        node: sortedPosts.filter((item) => item.userId == "moka")[0]
      },
      {
        cursor: encodeBase64({ hashKey: "moka", rangeKey: sortedPosts.filter((item) => item.userId == "moka")[1].id }),
        node: sortedPosts.filter((item) => item.userId == "moka")[1]
      },
      {
        cursor: encodeBase64({ hashKey: "moka", rangeKey: sortedPosts.filter((item) => item.userId == "moka")[2].id }),
        node: sortedPosts.filter((item) => item.userId == "moka")[2]
      }],
    })

    const result2 = await repository.retrieve({ indexName: "index__user_id", hash: "moka", limit: 2, desc: true })
    expect(result2.nodes.length).toEqual(2)

    const filtered = sortedPosts.filter((item) => item.userId == "moka")[1]
    expect(result2.endCursor).toEqual(encodeBase64({ hashKey: "moka", rangeKey: filtered.id }))
  })


  it("test persist(update) posts", async () => {
    const connection = await getSafeConnection("posts")
    const repository = new Repository(connection, createOptions(Post))

    const fakePost = createFakePost()

    const post = await repository.create(fakePost)
    post.content = "content+update@@moka"

    expect(await repository.persist(post)).toBeUndefined() // return void

    const foundPost = (await repository.find(post.pk, post.id))!

    expect(foundPost.content).toEqual("content+update@@moka")
    expect(foundPost).toEqual(post)
  })


  it("test remove", async () => {
    const connection = await getSafeConnection("users")
    const client = connection.client
    const repository = new Repository(connection, createOptions(User))
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    // exists!
    expect(await repository.find(user.id, user.username)).toEqual(user)
    expect(await client.getItem({
      TableName: "users",
      Key: {
        ["user_id"]: { S: user.id },
        ["username"]: { S: user.username },
      },
    }).promise()).not.toEqual(null)

    expect(await repository.remove(user)).toBeUndefined() // return void

    // not exists!
    expect(await repository.find(user.id, user.username)).toEqual(undefined)
    expect(await client.getItem({
      TableName: "users",
      Key: {
        ["user_id"]: { S: user.id },
        ["username"]: { S: user.username },
      },
    }).promise()).toEqual({})
  })

})
