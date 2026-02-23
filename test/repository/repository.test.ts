import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { GetItemCommand } from '@aws-sdk/client-dynamodb'

import { BiggerThanRange, DefaultRange, SmallerThanRange } from '../../lib'
import { fromDynamoMap } from '../../lib/connection/transformer'
import { createOptions } from '../../lib/repository/create-options'
import { Repository } from '../../lib/repository/repository'
import { getSafeConnection, delay } from '../helper'
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


function encodeBase64(cursor: Record<string, AttributeValue>): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

async function createSequential<T>(count: number, factory: () => Promise<T>): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < count; i++) {
    await delay(10)
    results.push(await factory())
  }
  return results
}


describe('Repository', () => {

  describe('toEntity / toPlain', () => {
    let repository: Repository<User>

    beforeAll(() => {
      const options = createOptions(User)
      repository = new Repository<User>(null as any, options)
    })

    it('toEntity: converts a DynamoDB row to Entity with correct property mapping', () => {
      const row = { user_id: 'abc', username: 'bob', email: 'b@b.com', type_tt: 'admin', created_at: 100 }
      const entity = repository.toEntity(row)

      expect(entity.id).toBe('abc')
      expect(entity.username).toBe('bob')
      expect(entity.email).toBe('b@b.com')
      expect(entity.type).toBe('admin')
      expect(entity.createdAt).toBe(100)
      expect(entity).toBeInstanceOf(User)
    })

    it('toEntity: converts array of rows', () => {
      const rows = [
        { user_id: 'a', username: 'u1', email: 'e1', type_tt: 't1', created_at: 1 },
        { user_id: 'b', username: 'u2', email: 'e2', type_tt: 't2', created_at: 2 },
      ]
      const entities = repository.toEntity(rows)

      expect(entities).toHaveLength(2)
      expect(entities[0]).toBeInstanceOf(User)
      expect(entities[1]).toBeInstanceOf(User)
      expect(entities[0].id).toBe('a')
      expect(entities[1].id).toBe('b')
    })

    it('toPlain: converts Entity to DynamoDB row with reverse mapping', () => {
      const row = { user_id: 'abc', username: 'bob', email: 'b@b.com', type_tt: 'admin', created_at: 100 }
      const entity = repository.toEntity(row)
      const plain = repository.toPlain(entity)

      expect(plain).toEqual(row)
    })

    it('toPlain: converts array of entities', () => {
      const rows = [
        { user_id: 'a', username: 'u1', email: 'e1', type_tt: 't1', created_at: 1 },
        { user_id: 'b', username: 'u2', email: 'e2', type_tt: 't2', created_at: 2 },
      ]
      const entities = repository.toEntity(rows)
      const plains = repository.toPlain(entities)

      expect(plains).toEqual(rows)
    })

    it('toEntity: ignores undefined fields in row', () => {
      const row = { user_id: 'abc', username: 'bob' }
      const entity = repository.toEntity(row)

      expect(entity.id).toBe('abc')
      expect(entity.username).toBe('bob')
      expect(entity.email).toBeUndefined()
    })

    it('roundtrip: toPlain(toEntity(row)) equals original row', () => {
      const row = { user_id: 'x', username: 'y', email: 'e', type_tt: 't', created_at: 999 }
      expect(repository.toPlain(repository.toEntity(row))).toEqual(row)
    })
  })


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


  describe('retrieve - pagination', () => {
    describe('STRING hash + STRING range (Post)', () => {
      it('paginates with limit and endCursor', async () => {
        const connection = await getSafeConnection('posts')
        const repository = connection.getRepository(Post)

        const posts = await createSequential(10, () => repository.create(createFakePost()))
        const sorted = [...posts].sort((a, b) => a.id > b.id ? -1 : a.id < b.id ? 1 : 0)

        const page1 = await repository.retrieve({ hash: 'all', limit: 5, desc: true })

        expect(page1.nodes).toEqual(sorted.slice(0, 5))
        expect(page1.endCursor).toBeDefined()
        expect(page1.endCursor).toBe(
          encodeBase64({ pk: { S: 'all' }, id: { S: sorted[4].id } })
        )

        const page2 = await repository.retrieve({ hash: 'all', after: page1.endCursor, desc: true })

        expect(page2.nodes).toEqual(sorted.slice(5))
        expect(page2.endCursor).toBeUndefined()
      })
    })

    describe('NUMBER hash + STRING range (Category)', () => {
      it('paginates with correct NUMBER cursor type', async () => {
        const connection = await getSafeConnection('categories')
        const repository = connection.getRepository(Category)

        const categories = await createSequential(10, () => repository.create(createFakeCategory()))
        const sorted = [...categories].sort((a, b) => a.id > b.id ? -1 : a.id < b.id ? 1 : 0)

        const page1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })

        expect(page1.nodes).toEqual(sorted.slice(0, 5))
        expect(page1.endCursor).toBe(
          encodeBase64({ hashKey: { N: '1' }, id: { S: `${sorted[4].id}` } })
        )

        const page2 = await repository.retrieve({ hash: 1, after: page1.endCursor, desc: true })

        expect(page2.nodes).toEqual(sorted.slice(5))
        expect(page2.endCursor).toBeUndefined()
      })
    })

    describe('NUMBER hash + NUMBER range (Comment)', () => {
      it('paginates with correct NUMBER cursor types', async () => {
        const connection = await getSafeConnection('comments')
        const repository = connection.getRepository(Comment)

        const comments = await createSequential(10, () => repository.create(createFakeComment()))
        const sorted = [...comments].sort((a, b) => b.type - a.type)

        const page1 = await repository.retrieve({ hash: 1, limit: 5, desc: true })

        expect(page1.nodes).toEqual(sorted.slice(0, 5))
        expect(page1.endCursor).toBe(
          encodeBase64({ type: { N: `${sorted[4].type}` }, pk: { N: '1' } })
        )

        const page2 = await repository.retrieve({ hash: 1, after: page1.endCursor, desc: true })

        expect(page2.nodes).toEqual(sorted.slice(5))
        expect(page2.endCursor).toBeUndefined()
      })
    })

    it('returns empty nodes for non-existent hash', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const result = await repository.retrieve({ hash: 'nonexistent' })

      expect(result.nodes).toEqual([])
    })
  })


  describe('retrieve - range conditions', () => {
    it('DefaultRange - exact match', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(5, () => repository.create(createFakeComment()))

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new DefaultRange(comments[2].type),
      })

      expect(result.nodes).toEqual([comments[2]])
    })

    it('BiggerThanRange - items with range > value', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new BiggerThanRange(ascending[6].type),
        desc: false,
      })

      expect(result.nodes).toHaveLength(3)
      expect(result.nodes).toEqual(ascending.slice(7))
    })

    it('SmallerThanRange - items with range < value', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new SmallerThanRange(ascending[3].type),
        desc: false,
      })

      expect(result.nodes).toHaveLength(3)
      expect(result.nodes).toEqual(ascending.slice(0, 3))
    })

    it('BiggerThanRange + pagination', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const page1 = await repository.retrieve({
        hash: 1,
        rangeOption: new BiggerThanRange(ascending[1].type),
        limit: 2,
        desc: false,
      })

      expect(page1.nodes).toHaveLength(2)
      expect(page1.nodes).toEqual(ascending.slice(2, 4))
      expect(page1.endCursor).toBeDefined()

      const page2 = await repository.retrieve({
        hash: 1,
        rangeOption: new BiggerThanRange(ascending[1].type),
        after: page1.endCursor,
        limit: 2,
        desc: false,
      })

      expect(page2.nodes).toHaveLength(2)
      expect(page2.nodes).toEqual(ascending.slice(4, 6))
    })
  })


  describe('retrieve - index', () => {
    it('retrieves via GSI', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 7; i++) {
        await delay(10)
        await repository.create(createFakePost(i < 3 ? 'moka' : undefined))
      }

      const result = await repository.retrieve({
        indexName: 'index__user_id__id',
        hash: 'moka',
        limit: 10,
        desc: true,
      })

      expect(result.nodes).toHaveLength(3)
      for (const node of result.nodes) {
        expect(node.userId).toBe('moka')
      }
    })

    it('GSI with DefaultRange filter on composite index', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      for (let i = 0; i < 10; i++) {
        await delay(10)
        if (i < 5) {
          await repository.create(createFakeMovie('moka', 'title!!'))
        } else {
          await repository.create(createFakeMovie())
        }
      }

      const result = await repository.retrieve({
        indexName: 'index__index_key__user_id__title',
        hash: 'all',
        rangeOption: new DefaultRange('moka__title!!'),
        limit: 3,
        desc: true,
      })

      expect(result.nodes).toHaveLength(3)
      for (const node of result.nodes) {
        expect(node.userId).toBe('moka')
        expect(node.title).toBe('title!!')
      }
    })

    it('returns empty for non-matching GSI hash', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)
      await repository.create(createFakePost())

      const result = await repository.retrieve({
        indexName: 'index__user_id__id',
        hash: 'nonexistent-user',
        desc: true,
      })

      expect(result.nodes).toHaveLength(0)
    })

    it('GSI pagination with endCursor', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 5; i++) {
        await delay(10)
        await repository.create(createFakePost('moka'))
      }

      const page1 = await repository.retrieve({
        indexName: 'index__user_id__id',
        hash: 'moka',
        limit: 2,
        desc: true,
      })

      expect(page1.nodes).toHaveLength(2)
      expect(page1.endCursor).toBeDefined()

      const page2 = await repository.retrieve({
        indexName: 'index__user_id__id',
        hash: 'moka',
        limit: 2,
        after: page1.endCursor,
        desc: true,
      })

      expect(page2.nodes).toHaveLength(2)

      const page3 = await repository.retrieve({
        indexName: 'index__user_id__id',
        hash: 'moka',
        limit: 2,
        after: page2.endCursor,
        desc: true,
      })

      expect(page3.nodes).toHaveLength(1)
      expect(page3.endCursor).toBeUndefined()
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

})
