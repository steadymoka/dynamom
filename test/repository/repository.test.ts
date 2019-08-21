import faker from "faker"

import { DynamoCursor } from "../../lib"
import kuuid from "kuuid"
import { createOptions } from "../../lib/repository/create-options"
import { Repository } from "../../lib/repository/repository"
import { fromDynamoAttributeMap } from "../../lib/connection/from-dynamo-attribute"
import { getSafeConnection } from "../helper"
import { User } from "../stubs/user"
import { Post } from "../stubs/post"
import { Category } from "../stubs/category"
import { Comment } from "../stubs/comment"
import { Movie } from "../stubs/movie"


const range = (start: number, end: number) => Array.from({ length: (end - start) }, (_, k) => k + start)
const delay = (time: any) => new Promise(res => setTimeout(res, time))

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

function createFakeMovie(userId?: string, title?: string) {
  return {
    user_id: userId ? userId : faker.random.word(),
    title: title ? title : faker.random.word(),
    description: faker.random.word(),
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


  it("test create only hashKey", async () => {
    const connection = await getSafeConnection("movies")
    const client = connection.client
    const repository = new Repository(connection, createOptions(Movie))
    const fakeMovie = createFakeMovie()

    const movie = await repository.create(fakeMovie)

    expect(movie).toEqual({
      id: movie.id,
      user_id: fakeMovie.user_id,
      title: fakeMovie.title,
      description: fakeMovie.description,
      createdAt: fakeMovie.createdAt,
      indexKey: "all",
      user_id__title: movie.user_id__title
    })
    expect(movie).toBeInstanceOf(Movie)

    const result = await client.getItem({
      TableName: "movies",
      Key: {
        ["id"]: { S: movie.id },
      },
    }).promise()

    expect({
      id: movie.id,
      user_id: fakeMovie.user_id,
      title: fakeMovie.title,
      description: fakeMovie.description,
      created_at: fakeMovie.createdAt,
      index_key: "all",
      user_id__title: movie.user_id__title
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


  it("test find only hashKey", async () => {
    const connection = await getSafeConnection("movies")
    const repository = new Repository(connection, createOptions(Movie))
    const fakeMovie = createFakeMovie()

    const movie = await repository.create(fakeMovie)
    const foundMovie = await repository.find(movie.id)

    expect(foundMovie).toEqual(movie)
    expect(foundMovie).toEqual({
      id: movie.id,
      user_id: fakeMovie.user_id,
      title: fakeMovie.title,
      description: fakeMovie.description,
      createdAt: fakeMovie.createdAt,
      indexKey: "all",
      user_id__title: movie.user_id__title
    })
    expect(foundMovie).toBeInstanceOf(Movie)
  })


  it("test retrieve hashKey is STRING type & sortKey is STRING type", async () => {
    const connection = await getSafeConnection("posts")
    const repository = new Repository(connection, createOptions(Post))

    const posts = await Promise.all(range(0, 10).map(async () => { await delay(200); return repository.create(createFakePost()) }))
    const sortedPosts = posts.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: "all", limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: "all", after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedPosts.slice(0, 5).map(post => ({
        cursor: encodeBase64({ hashKey: "all", rangeKey: post.id }),
        node: post,
      })),
      endCursor: encodeBase64({ hashKey: "all", rangeKey: sortedPosts[4].id }),
    })

    expect(result2).toEqual({
      nodes: sortedPosts.slice(5).map(post => ({
        cursor: encodeBase64({ hashKey: "all", rangeKey: post.id }),
        node: post,
      })),
    })
  })


  it("test retrieve hashKey is NUMBER type & sortKey is STRING type", async () => {
    const connection = await getSafeConnection("categories")
    const repository = new Repository(connection, createOptions(Category))

    const categories = await Promise.all(range(0, 10).map(async () => { await delay(200); return repository.create(createFakeCategory()) }))
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


  it("test retrieve hashKey is NUMBER type & sortKey is NUMBER type", async () => {
    const connection = await getSafeConnection("comments")
    const repository = new Repository(connection, createOptions(Comment))

    const comments = await Promise.all(range(0, 10).map(async () => { await delay(200); return repository.create(createFakeComment()) }))
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


  it("test retrieve by INDEX", async () => {
    const connection = await getSafeConnection("posts")
    const repository = new Repository(connection, createOptions(Post))

    const posts = await Promise.all(range(0, 10).map(async (i) => {
      await delay(200)
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

    const result3 = await repository.retrieve({ indexName: "index__user_id", hash: "aaaaaaaa", limit: 2, desc: true })
    expect(result3.nodes.length).toEqual(0)
  })


  it("test retrieve by INDEX and FILTER", async () => {
    const connection = await getSafeConnection("movies")
    const repository = new Repository(connection, createOptions(Movie))

    const movies = await Promise.all(range(0, 10).map(async (i) => {
      await delay(200)
      if (i == 2 || i == 3 || i == 5 || i == 6 || i == 7) {
        return repository.create(createFakeMovie("moka", "title!!"))
      }
      else {
        return repository.create(createFakeMovie())
      }
    }))
    const sortedMovies = movies.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)
    const filteredMovies = sortedMovies.filter(({ user_id }) => user_id == "moka")

    const result1 = await repository.retrieve({ indexName: "index__user_id_title", hash: "all", range: `moka__title!!`, limit: 3, desc: true })
    
    expect(result1).toEqual({
      nodes: filteredMovies.slice(0, 3).map(movie => ({
        cursor: encodeBase64({ hashKey: "all", rangeKey: movie.user_id__title }),
        node: movie,
      })),
      endCursor: encodeBase64({ hashKey: "all", rangeKey: filteredMovies[2].user_id__title }),
    })
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
