import { Key } from 'aws-sdk/clients/dynamodb'

import { BiggerThanRange, DefaultRange } from '../../lib'
import { fromDynamoMap } from '../../lib/connection/transformer'
import { createOptions } from '../../lib/repository/create-options'
import { Repository } from '../../lib/repository/repository'
import { getSafeConnection } from '../helper'
import { Category } from '../stubs/category'
import { Comment } from '../stubs/comment'
import {
  createFakeCategory,
  createFakeComment,
  createFakeMovie,
  createFakePost,
  createFakeUser,
} from '../stubs/create-faker'
import { Movie } from '../stubs/movie'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'


const range = (start: number, end: number) => Array.from({ length: end - start }, (_, k) => k + start)
const delay = (time: any) => new Promise(res => setTimeout(res, time))

function encodeBase64(cursor: Key): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

describe('testsuite of repository/repository', () => {
  it('test create', async () => {
    const connection = await getSafeConnection('users')
    const client = connection.client
    const repository = connection.getRepository(User)
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
      TableName: 'users',
      Key: {
        user_id: { S: user.id },
        username: { S: user.username },
      },
    }).promise()

    expect({
      user_id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type_tt: fakeUser.type,
      created_at: fakeUser.createdAt,
    }).toEqual(fromDynamoMap(result.Item!))
  })


  it('test create only hashKey', async () => {
    const connection = await getSafeConnection('movies')
    const client = connection.client
    const repository = new Repository<Movie>(connection, createOptions(Movie))
    const fakeMovie = createFakeMovie()

    const movie = await repository.create(fakeMovie)

    expect(movie).toEqual({
      id: movie.id,
      userId: fakeMovie.userId,
      title: fakeMovie.title,
      description: fakeMovie.description,
      createdAt: fakeMovie.createdAt,
      indexKey: fakeMovie.indexKey,
    })
    expect(movie).toBeInstanceOf(Movie)

    const result = await client.getItem({
      TableName: 'movies',
      Key: {
        id: { S: movie.id },
      },
    }).promise()

    expect({
      id: movie.id,
      user_id: fakeMovie.userId,
      title: fakeMovie.title,
      description: fakeMovie.description,
      created_at: fakeMovie.createdAt,
      index_key: fakeMovie.indexKey,
      user_id__title: (fromDynamoMap(result.Item!) as any)['user_id__title'],
    }).toEqual(fromDynamoMap(result.Item!))
  })


  it('test find', async () => {
    const connection = await getSafeConnection('users')
    const repository = connection.getRepository(User)
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)
    const foundUser01 = await repository.findOne({ hash: user.id, range: user.username })

    expect(foundUser01).toEqual(user)
    expect(foundUser01).toEqual({
      id: user.id,
      username: fakeUser.username,
      email: fakeUser.email,
      type: fakeUser.type,
      createdAt: fakeUser.createdAt,
    })
    expect(foundUser01).toBeInstanceOf(User)
  })


  it('test findByCursors', async () => {
    const connection = await getSafeConnection('users')
    const repository = connection.getRepository(User)
    const users = await Promise.all(range(0, 10).map(async () => {
      await delay(100)
      return repository.create(createFakeUser())
    }))
    const foundUsers = await repository.findOnes(users.map(({ id, username }) => { return { hash: id, range: username } }))

    expect(
      foundUsers!.sort((a: any, b: any) => a.createdAt < b.createdAt ? 1 : -1)
    ).toEqual(
      users.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)
    )
  })


  it('test count', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    const posts = await Promise.all(range(0, 10).map(async (i) => {
      await delay(100)
      if (i == 2 || i == 3 || i == 5) {
        return repository.create(createFakePost('moka'))
      }

      return repository.create(createFakePost())

    }))

    expect(await repository.count({ hash: 'all' })).toEqual(10)
    expect(await repository.count({ indexName: 'index__user_id__id', hash: 'moka' })).toEqual(3)
  })


  it('test find only hashKey', async () => {
    const connection = await getSafeConnection('movies')
    const repository = connection.getRepository(Movie)
    const fakeMovie = createFakeMovie()

    const movie = await repository.create(fakeMovie)
    const foundMovie = await repository.findOne({ hash: movie.id })

    expect({ user_id__title: (movie as any)['user_id__title'], ...foundMovie }).toEqual(movie)
    expect(foundMovie).toEqual({
      id: movie.id,
      userId: fakeMovie.userId,
      title: fakeMovie.title,
      description: fakeMovie.description,
      createdAt: fakeMovie.createdAt,
      indexKey: 'all',
    })
    expect(foundMovie).toBeInstanceOf(Movie)
  })


  it('test retrieve hashKey is STRING type & sortKey is STRING type', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    const posts = await Promise.all(range(0, 10).map(async () => { await delay(100); return repository.create(createFakePost()) }))
    const sortedPosts = posts.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: 'all', limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: 'all', after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedPosts.slice(0, 5),
      endCursor: encodeBase64({ pk: { S: 'all' }, id: { S: sortedPosts[4].id } }),
    })

    expect(result2).toEqual({
      nodes: sortedPosts.slice(5),
    })
  })


  it('test retrieve hashKey is NUMBER type & sortKey is STRING type', async () => {
    const connection = await getSafeConnection('categories')
    const repository = connection.getRepository(Category)

    const categories = await Promise.all(range(0, 10).map(async () => { await delay(100); return repository.create(createFakeCategory()) }))
    const sortedCategories = categories.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: 1, after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedCategories.slice(0, 5),
      endCursor: encodeBase64({ hashKey: { N: '1' }, id: { S: `${sortedCategories[4].id}` } }),
    })

    expect(result2).toEqual({
      nodes: sortedCategories.slice(5),
    })
  })

  it('test retrieve hashKey is NUMBER type & sortKey is NUMBER type', async () => {
    const connection = await getSafeConnection('comments')
    const repository = connection.getRepository(Comment)

    const comments = await Promise.all(range(0, 10).map(async () => { await delay(100); return repository.create(createFakeComment()) }))
    const sortedComments = comments.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result = await repository.retrieve({ hash: 1, rangeOption: new DefaultRange(comments[2].type) })
    expect(result).toEqual({
      nodes: [comments[2]],
    })

    const result1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })
    const result2 = await repository.retrieve({ hash: 1, after: result1.endCursor, desc: true })

    expect(result1).toEqual({
      nodes: sortedComments.slice(0, 5),
      endCursor: encodeBase64({ type: { N: `${sortedComments[4].type}` }, pk: { N: '1' } }),
    })

    expect(result2).toEqual({
      nodes: sortedComments.slice(5),
    })
  })

  it('test retrieve hashKey is NUMBER type & sortKey is NUMBER type & test condition', async () => {
    const connection = await getSafeConnection('comments')
    const repository = connection.getRepository(Comment)

    const comments = await Promise.all(range(0, 10).map(async () => { await delay(100); return repository.create(createFakeComment()) }))
    const sortedComments = comments.sort((a, b) => a.createdAt > b.createdAt ? 1 : -1) // 오름차순
    expect(comments.length).toEqual(10)

    const result1 = await repository.retrieve({
      hash: 1,
      rangeOption: new BiggerThanRange(sortedComments[6].type),
      desc: false,
    })
    expect(result1.nodes.length).toEqual(3)

    const result2 = await repository.retrieve({
      hash: 1,
      rangeOption: new BiggerThanRange(sortedComments[1].type),
      limit: 2,
      desc: false,
    })
    expect(result2.nodes.length).toEqual(2)
    expect(result2).toEqual({
      nodes: sortedComments.slice(2, 4),
      endCursor: encodeBase64({ type: { N: `${sortedComments[3].type}` }, pk: { N: `${sortedComments[3].pk}` } }),
    })
    const result3 = await repository.retrieve({
      hash: 1,
      rangeOption: new BiggerThanRange(sortedComments[1].type),
      after: result2.endCursor,
      limit: 2,
      desc: false,
    })
    expect(result3.nodes.length).toEqual(2)
    expect(result3).toEqual({
      nodes: sortedComments.slice(4, 6),
      endCursor: encodeBase64({ type: { N: `${sortedComments[5].type}` }, pk: { N: `${sortedComments[5].pk}` } }),
    })
  })

  it('test retrieve by INDEX', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    const posts = await Promise.all(range(0, 10).map(async (i) => {
      await delay(100)
      if (i == 2 || i == 3 || i == 5) {
        return repository.create(createFakePost('moka'))
      }

      return repository.create(createFakePost())

    }))
    const sortedPosts = posts.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)

    const result1 = await repository.retrieve({ indexName: 'index__user_id__id', hash: 'moka', limit: 5, desc: true })
    expect(result1.nodes.length).toEqual(3)

    expect(result1).toEqual({
      nodes: [sortedPosts.filter((item) => item.userId == 'moka')[0],
        sortedPosts.filter((item) => item.userId == 'moka')[1],
        sortedPosts.filter((item) => item.userId == 'moka')[2]],
    })

    const result2 = await repository.retrieve({ indexName: 'index__user_id__id', hash: 'moka', limit: 2, desc: true })
    expect(result2.nodes.length).toEqual(2)

    const result3 = await repository.retrieve({ indexName: 'index__user_id__id', hash: 'aaaaaaaa', limit: 2, desc: true })
    expect(result3.nodes.length).toEqual(0)

    const resultAfter = await repository.retrieve({ indexName: 'index__user_id__id', hash: 'moka', limit: 2, after: result2.endCursor, desc: true })

    const result4 = await repository.findOne({ indexName: 'index__user_id__id', hash: 'moka' })
  })


  it('test retrieve by INDEX and FILTER', async () => {
    const connection = await getSafeConnection('movies')
    const repository = connection.getRepository(Movie)

    const movies = await Promise.all(range(0, 10).map(async (i) => {
      await delay(100)
      if (i == 2 || i == 3 || i == 5 || i == 6 || i == 7) {
        return repository.create(createFakeMovie('moka', 'title!!'))
      }

      return repository.create(createFakeMovie())

    }))
    const sortedMovies = movies.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)
    const filteredMovies = sortedMovies.filter(({ userId }) => userId == 'moka')

    const result1 = await repository.retrieve({
      indexName: 'index__index_key__user_id__title',
      hash: 'all',
      rangeOption: new DefaultRange('moka__title!!'),
      limit: 3,
      desc: true,
    })

    expect(result1.nodes).toEqual(filteredMovies.slice(0, 3))
  })


  it('test findOne with index, hash, range', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    const posts = await Promise.all(range(0, 10).map(async (i) => {
      await delay(100)
      if (i == 2 || i == 3 || i == 5) {
        return repository.create(createFakePost('moka'))
      }
      if (i == 4) {
        return repository.create(createFakePost('moka_a'))
      }

      return repository.create(createFakePost())

    }))

    const savedPosts = posts.filter(({ userId }) => userId == 'moka')
    expect(savedPosts.length).toEqual(3)

    range(0, 2).forEach(async (i) => {
      const savedPost = savedPosts[i]
      const findPost = await repository.findOne({ indexName: 'index__user_id__id', hash: savedPost.userId, range: savedPost.id })
      expect(savedPost).toEqual(findPost)
    })
  })


  it('test persist(update) posts', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    const fakePost = createFakePost()

    const post = await repository.create(fakePost)
    post.content = 'content+update@@moka'
    post.enable = false

    expect(await repository.persist(post)).toBeUndefined() // return void

    const foundPost = await repository.findOne({ hash: post.pk, range: post.id })

    if (foundPost) {
      expect(foundPost.content).toEqual('content+update@@moka')
      expect(foundPost.enable).toEqual(false)
      expect(foundPost).toEqual(post)
    }
  })


  it('test remove', async () => {
    const connection = await getSafeConnection('users')
    const client = connection.client
    const repository = connection.getRepository(User)
    const fakeUser = createFakeUser()

    const user = await repository.create(fakeUser)

    // exists!
    expect(await repository.findOne({ hash: user.id, range: user.username })).toEqual(user)
    expect(await client.getItem({
      TableName: 'users',
      Key: {
        user_id: { S: user.id },
        username: { S: user.username },
      },
    }).promise()).not.toEqual(null)

    expect(await repository.remove(user)).toBeUndefined() // return void

    // not exists!
    expect(await repository.findOne({ hash: user.id, range: user.username })).toEqual(undefined)
    expect(await client.getItem({
      TableName: 'users',
      Key: {
        user_id: { S: user.id },
        username: { S: user.username },
      },
    }).promise()).toEqual({})
  })

})
