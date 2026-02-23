import { GetItemCommand } from '@aws-sdk/client-dynamodb'

import { fromDynamoMap } from '../../lib/connection/transformer'
import { getSafeConnection, delay, createSequential } from '../helper'
import { Comment } from '../stubs/comment'
import { Movie } from '../stubs/movie'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'
import {
  createFakeComment,
  createFakeMovie,
  createFakePost,
  createFakeUser,
} from '../stubs/create-faker'


describe('CRUD', () => {

  describe('create', () => {
    it('creates hash+range entity (User) with uuid auto-generation', async () => {
      const connection = await getSafeConnection('users')
      const client = connection.client
      const repository = connection.getRepository(User)
      const fakeUser = createFakeUser()

      const user = await repository.create(fakeUser)

      expect(user.id).toBeDefined()
      expect(user.id).toMatch(/^[0-9a-f-]{36}$/) // uuid format
      expect(user.username).toBe(fakeUser.username)
      expect(user.email).toBe(fakeUser.email)
      expect(user.type).toBe(fakeUser.type)
      expect(user.createdAt).toBe(fakeUser.createdAt)
      expect(user).toBeInstanceOf(User)

      const result = await client.send(new GetItemCommand({
        TableName: 'users',
        Key: {
          user_id: { S: user.id },
          username: { S: user.username },
        },
      }))
      const stored = fromDynamoMap(result.Item!)
      expect(stored).toEqual({
        user_id: user.id,
        username: fakeUser.username,
        email: fakeUser.email,
        type_tt: fakeUser.type,
        created_at: fakeUser.createdAt,
      })
    })

    it('creates hash only entity (Movie) with kuuid auto-generation', async () => {
      const connection = await getSafeConnection('movies')
      const client = connection.client
      const repository = connection.getRepository(Movie)
      const fakeMovie = createFakeMovie()

      const movie = await repository.create(fakeMovie)

      expect(movie.id).toBeDefined()
      expect(movie).toBeInstanceOf(Movie)
      expect(movie.userId).toBe(fakeMovie.userId)
      expect(movie.title).toBe(fakeMovie.title)

      const result = await client.send(new GetItemCommand({
        TableName: 'movies',
        Key: { id: { S: movie.id } },
      }))
      const stored = fromDynamoMap(result.Item!)
      expect(stored['id']).toBe(movie.id)
      expect(stored['user_id']).toBe(fakeMovie.userId)
      // composite index key: user_id__title should be generated
      expect(stored['user_id__title']).toBeDefined()
      expect((stored['user_id__title'] as string).startsWith(`${fakeMovie.userId}__${fakeMovie.title}__`)).toBe(true)
    })
  })


  describe('findOne', () => {
    it('finds by hash+range', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)
      const user = await repository.create(createFakeUser())

      const found = await repository.findOne({ hash: user.id, range: user.username })

      expect(found).toEqual(user)
      expect(found).toBeInstanceOf(User)
    })

    it('finds by hash only', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)
      const movie = await repository.create(createFakeMovie())

      const found = await repository.findOne({ hash: movie.id })

      expect(found).toBeDefined()
      expect(found!.id).toBe(movie.id)
      expect(found).toBeInstanceOf(Movie)
    })

    it('finds by index (indexName + hash)', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)
      await repository.create(createFakePost('moka'))

      const found = await repository.findOne({ indexName: 'index__user_id__id', hash: 'moka' })

      expect(found).toBeDefined()
      expect(found!.userId).toBe('moka')
    })

    it('finds by index + hash + range', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)
      const post = await repository.create(createFakePost('moka'))

      const found = await repository.findOne({ indexName: 'index__user_id__id', hash: 'moka', range: post.id })

      expect(found).toEqual(post)
    })

    it('returns undefined for non-existent item', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const found = await repository.findOne({ hash: 'nonexistent', range: 'nonexistent' })

      expect(found).toBeUndefined()
    })

    it('falls back to retrieve when range is omitted on range-key entity', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)
      await repository.create(createFakePost())

      const found = await repository.findOne({ hash: 'all' })

      expect(found).toBeDefined()
      expect(found!.pk).toBe('all')
    })
  })


  describe('findOnes', () => {
    it('batch retrieves multiple items', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const users = await createSequential(5, () => repository.create(createFakeUser()))
      const cursors = users.map(({ id, username }) => ({ hash: id, range: username }))

      const found = await repository.findOnes(cursors)

      expect(found).toBeDefined()
      expect(found!).toHaveLength(5)
      for (const user of users) {
        expect(found!.find(f => f.id === user.id)).toBeDefined()
      }
    })

    it('returns empty array for empty cursors', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const found = await repository.findOnes([])

      expect(found).toEqual([])
    })
  })


  describe('count', () => {
    it('counts all items by hash', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await createSequential(5, () => repository.create(createFakePost()))

      expect(await repository.count({ hash: 'all' })).toBe(5)
    })

    it('counts items by index', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 7; i++) {
        await delay(10)
        await repository.create(createFakePost(i < 3 ? 'moka' : undefined))
      }

      expect(await repository.count({ indexName: 'index__user_id__id', hash: 'moka' })).toBe(3)
    })

    it('returns 0 when no match', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      expect(await repository.count({ hash: 'nonexistent-hash' })).toBe(0)
    })
  })


  describe('persist', () => {
    it('updates attributes and verifies via findOne', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create(createFakePost())
      post.content = 'updated-content'
      post.enable = false

      expect(await repository.persist(post)).toBeUndefined()

      const found = await repository.findOne({ hash: post.pk, range: post.id })

      expect(found).toBeDefined()
      expect(found!.content).toBe('updated-content')
      expect(found!.enable).toBe(false)
      expect(found!).toEqual(post)
    })

    it('updates multiple attributes simultaneously', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const user = await repository.create(createFakeUser())
      user.email = 'new@email.com'
      user.type = 'admin'

      await repository.persist(user)

      const found = await repository.findOne({ hash: user.id, range: user.username })
      expect(found!.email).toBe('new@email.com')
      expect(found!.type).toBe('admin')
    })
  })


  describe('remove', () => {
    it('deletes item and verifies via findOne', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const user = await repository.create(createFakeUser())
      expect(await repository.findOne({ hash: user.id, range: user.username })).toEqual(user)

      expect(await repository.remove(user)).toBeUndefined()

      expect(await repository.findOne({ hash: user.id, range: user.username })).toBeUndefined()
    })

    it('deletes item and verifies via direct GetItemCommand', async () => {
      const connection = await getSafeConnection('users')
      const client = connection.client
      const repository = connection.getRepository(User)

      const user = await repository.create(createFakeUser())

      const before = await client.send(new GetItemCommand({
        TableName: 'users',
        Key: {
          user_id: { S: user.id },
          username: { S: user.username },
        },
      }))
      expect(before.Item).toBeDefined()

      await repository.remove(user)

      const after = await client.send(new GetItemCommand({
        TableName: 'users',
        Key: {
          user_id: { S: user.id },
          username: { S: user.username },
        },
      }))
      expect(after.Item).toBeUndefined()
    })
  })


  describe('upsert', () => {
    it('creates new entity when it does not exist', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      const movie = await repository.upsert(createFakeMovie())

      expect(movie.id).toBeDefined()
      expect(movie).toBeInstanceOf(Movie)

      const found = await repository.findOne({ hash: movie.id })
      expect(found).toBeDefined()
      expect(found!.title).toBe(movie.title)
    })

    it('overwrites existing entity (PutItem upsert behavior)', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      const movie = await repository.create(createFakeMovie('alice', 'original'))

      const updated = await repository.upsert({
        id: movie.id,
        userId: 'alice',
        title: 'updated',
        description: 'new description',
        createdAt: 999,
        indexKey: 'all',
      } as any)

      expect(updated.id).toBe(movie.id)
      expect(updated.title).toBe('updated')

      const found = await repository.findOne({ hash: movie.id })
      expect(found!.title).toBe('updated')
      expect(found!.description).toBe('new description')
    })

    it('does not overwrite provided key values', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      const movie = await repository.upsert({
        id: 'explicit-id-123',
        userId: 'bob',
        title: 'test',
        description: 'desc',
        createdAt: 100,
        indexKey: 'all',
      } as any)

      expect(movie.id).toBe('explicit-id-123')
    })
  })

})
