import { GetItemCommand } from '@aws-sdk/client-dynamodb'

import {
  BiggerThanRange,
  SmallerThanRange,
  GteRange,
  LteRange,
  BeginsWithRange,
  BetweenRange,
  F,
  TransactWriter,
} from '../../lib'
import { fromDynamoMap } from '../../lib/connection/transformer'
import { ExpressionBuilder } from '../../lib/expression/expression-builder'
import { getSafeConnection, delay } from '../helper'
import { Comment } from '../stubs/comment'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'
import { Movie } from '../stubs/movie'
import {
  createFakeComment,
  createFakePost,
  createFakeUser,
  createFakeMovie,
} from '../stubs/create-faker'


async function createSequential<T>(count: number, factory: () => Promise<T>): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < count; i++) {
    await delay(10)
    results.push(await factory())
  }
  return results
}


describe('v0.4 Features', () => {

  describe('ExpressionBuilder', () => {
    it('generates unique placeholders', () => {
      const builder = new ExpressionBuilder()

      expect(builder.addName('email')).toBe('#a0')
      expect(builder.addName('type')).toBe('#a1')
      expect(builder.addValue('test')).toBe(':v0')
      expect(builder.addValue(42)).toBe(':v1')

      expect(builder.getNames()).toEqual({ '#a0': 'email', '#a1': 'type' })
      expect(builder.getValues()).toEqual({
        ':v0': { S: 'test' },
        ':v1': { N: '42' },
      })
    })
  })


  describe('FilterCondition', () => {
    it('F.eq builds correct expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.eq('email', 'test@test.com').build(builder)

      expect(expr).toBe('#a0 = :v0')
      expect(builder.getNames()).toEqual({ '#a0': 'email' })
      expect(builder.getValues()).toEqual({ ':v0': { S: 'test@test.com' } })
    })

    it('F.and combines conditions', () => {
      const builder = new ExpressionBuilder()
      const expr = F.and(F.eq('a', 1), F.gt('b', 2)).build(builder)

      expect(expr).toBe('(#a0 = :v0 AND #a1 > :v1)')
    })

    it('F.or combines conditions', () => {
      const builder = new ExpressionBuilder()
      const expr = F.or(F.eq('a', 1), F.eq('b', 2)).build(builder)

      expect(expr).toBe('(#a0 = :v0 OR #a1 = :v1)')
    })

    it('F.not negates condition', () => {
      const builder = new ExpressionBuilder()
      const expr = F.not(F.eq('a', 1)).build(builder)

      expect(expr).toBe('NOT (#a0 = :v0)')
    })

    it('F.between builds BETWEEN expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.between('age', 18, 65).build(builder)

      expect(expr).toBe('#a0 BETWEEN :v0 AND :v1')
    })

    it('F.beginsWith builds begins_with expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.beginsWith('name', 'Joh').build(builder)

      expect(expr).toBe('begins_with(#a0, :v0)')
    })

    it('F.contains builds contains expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.contains('tags', 'nodejs').build(builder)

      expect(expr).toBe('contains(#a0, :v0)')
    })

    it('F.exists builds attribute_exists expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.exists('email').build(builder)

      expect(expr).toBe('attribute_exists(#a0)')
    })

    it('F.notExists builds attribute_not_exists expression', () => {
      const builder = new ExpressionBuilder()
      const expr = F.notExists('email').build(builder)

      expect(expr).toBe('attribute_not_exists(#a0)')
    })
  })


  describe('Range Query - new operators', () => {
    it('GteRange - items with range >= value', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new GteRange(ascending[7].type),
        desc: false,
      })

      expect(result.nodes).toHaveLength(3)
      expect(result.nodes).toEqual(ascending.slice(7))
    })

    it('LteRange - items with range <= value', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new LteRange(ascending[2].type),
        desc: false,
      })

      expect(result.nodes).toHaveLength(3)
      expect(result.nodes).toEqual(ascending.slice(0, 3))
    })

    it('BetweenRange - items with range between low and high', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new BetweenRange(ascending[3].type, ascending[6].type),
        desc: false,
      })

      expect(result.nodes).toHaveLength(4)
      expect(result.nodes).toEqual(ascending.slice(3, 7))
    })

    it('BeginsWithRange - string range prefix match', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create(createFakePost())

      const result = await repository.retrieve({
        hash: 'all',
        rangeOption: new BeginsWithRange(post.id.substring(0, 8)),
      })

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].id).toBe(post.id)
    })
  })


  describe('Filter Expression - query', () => {
    it('filters query results by non-key attribute', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 5; i++) {
        await delay(10)
        await repository.create({ ...createFakePost('moka'), enable: i < 3 })
      }

      const result = await repository.retrieve({
        hash: 'all',
        filter: F.eq('enable', true),
      })

      expect(result.nodes).toHaveLength(3)
      for (const node of result.nodes) {
        expect(node.enable).toBe(true)
      }
    })

    it('filters with AND condition', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await delay(10)
      await repository.create({ ...createFakePost('moka'), content: 'hello', enable: true })
      await delay(10)
      await repository.create({ ...createFakePost('moka'), content: 'hello', enable: false })
      await delay(10)
      await repository.create({ ...createFakePost('moka'), content: 'world', enable: true })

      const result = await repository.retrieve({
        hash: 'all',
        filter: F.and(F.eq('content', 'hello'), F.eq('enable', true)),
      })

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].content).toBe('hello')
      expect(result.nodes[0].enable).toBe(true)
    })

    it('filters with OR condition', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await delay(10)
      await repository.create({ ...createFakePost('u1'), content: 'aaa' })
      await delay(10)
      await repository.create({ ...createFakePost('u2'), content: 'bbb' })
      await delay(10)
      await repository.create({ ...createFakePost('u3'), content: 'ccc' })

      const result = await repository.retrieve({
        hash: 'all',
        filter: F.or(F.eq('user_id', 'u1'), F.eq('user_id', 'u3')),
      })

      expect(result.nodes).toHaveLength(2)
    })

    it('filter combined with range condition', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comments = await createSequential(10, () => repository.create(createFakeComment()))
      const ascending = [...comments].sort((a, b) => a.type - b.type)

      const targetUserId = ascending[5].userId

      const result = await repository.retrieve({
        hash: 1,
        rangeOption: new BiggerThanRange(ascending[3].type),
        filter: F.eq('user_id', targetUserId),
        desc: false,
      })

      for (const node of result.nodes) {
        expect(node.userId).toBe(targetUserId)
        expect(node.type).toBeGreaterThan(ascending[3].type)
      }
    })
  })


  describe('Scan', () => {
    it('scans all items in table', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      await createSequential(5, () => repository.create(createFakeUser()))

      const result = await repository.scan()

      expect(result.nodes).toHaveLength(5)
      for (const node of result.nodes) {
        expect(node).toBeInstanceOf(User)
      }
    })

    it('scans with filter', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 5; i++) {
        await delay(10)
        await repository.create({ ...createFakePost(), enable: i < 2 })
      }

      const result = await repository.scan({
        filter: F.eq('enable', false),
      })

      expect(result.nodes).toHaveLength(3)
      for (const node of result.nodes) {
        expect(node.enable).toBe(false)
      }
    })

    it('scans with pagination', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      await createSequential(5, () => repository.create(createFakeUser()))

      const page1 = await repository.scan({ limit: 3 })
      expect(page1.nodes).toHaveLength(3)
      expect(page1.endCursor).toBeDefined()

      const page2 = await repository.scan({ limit: 3, after: page1.endCursor })
      expect(page2.nodes).toHaveLength(2)
      expect(page2.endCursor).toBeUndefined()
    })
  })


  describe('Update REMOVE/ADD', () => {
    it('increment atomically increases a numeric attribute', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comment = await repository.create({
        ...createFakeComment(),
        createdAt: 100,
      })

      await repository.increment(comment, 'createdAt', 5)

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.createdAt).toBe(105)
    })

    it('increment with default amount of 1', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      const comment = await repository.create({
        ...createFakeComment(),
        createdAt: 50,
      })

      await repository.increment(comment, 'createdAt')

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.createdAt).toBe(51)
    })

    it('removeAttributes removes specified attributes', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create(createFakePost())
      expect(post.content).toBeDefined()

      await repository.removeAttributes(post, ['content'])

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.content).toBeUndefined()
      expect(found!.enable).toBe(true)
    })

    it('persist with remove option removes attributes while updating', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create(createFakePost())
      post.enable = false

      await repository.persist(post, { remove: ['content'] })

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.enable).toBe(false)
      expect(found!.content).toBeUndefined()
    })
  })


  describe('Conditional Expression', () => {
    it('conditional create fails when item already exists (hash-only table)', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      const movie = await repository.create(createFakeMovie())

      // upsert the same id with condition that it shouldn't exist
      await expect(
        repository.upsert({
          id: movie.id,
          userId: 'other',
          title: 'other',
          description: 'other',
          createdAt: 0,
          indexKey: 'all',
        } as any)
      ).resolves.toBeDefined() // upsert without condition always succeeds

      // Now use create with condition — should fail because item exists
      await expect(
        repository.create(
          createFakeMovie(),
          { condition: F.notExists('id') },
        )
      ).resolves.toBeDefined() // this creates a NEW item (new kuuid), so condition passes

      // To truly test: we need to use putItem directly with a known key
      const existing = await repository.create(createFakeMovie())
      // create another entity with the same key but with condition
      const node: any = {
        id: existing.id,
        user_id: 'conflict',
        title: 'conflict',
        description: 'conflict',
        create_at: 0,
        index_key: 'all',
      }

      await expect(
        connection.putItem(repository.options, {
          cursor: { hash: existing.id },
          node,
        }, F.notExists('id'))
      ).rejects.toThrow()
    })

    it('conditional create succeeds when item does not exist', async () => {
      const connection = await getSafeConnection('movies')
      const repository = connection.getRepository(Movie)

      const movie = await repository.create(
        createFakeMovie(),
        { condition: F.notExists('id') },
      )

      expect(movie).toBeDefined()
      expect(movie.id).toBeDefined()
    })

    it('conditional remove fails when condition not met', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({ ...createFakePost(), enable: true })

      await expect(
        repository.remove(post, { condition: F.eq('enable', false) })
      ).rejects.toThrow()

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found).toBeDefined()
    })

    it('conditional remove succeeds when condition met', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({ ...createFakePost(), enable: true })

      await repository.remove(post, { condition: F.eq('enable', true) })

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found).toBeUndefined()
    })
  })


  describe('Projection Expression', () => {
    it('retrieve with select returns only specified properties', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await repository.create(createFakePost())

      const result = await repository.retrieve({
        hash: 'all',
        select: ['pk', 'id', 'userId'],
      })

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].pk).toBeDefined()
      expect(result.nodes[0].id).toBeDefined()
      expect(result.nodes[0].userId).toBeDefined()
      expect(result.nodes[0].content).toBeUndefined()
      expect(result.nodes[0].enable).toBeUndefined()
    })

    it('scan with select returns only specified properties', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      await repository.create(createFakeUser())

      const result = await repository.scan({
        select: ['id', 'username'],
      })

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].id).toBeDefined()
      expect(result.nodes[0].username).toBeDefined()
      expect(result.nodes[0].email).toBeUndefined()
    })
  })


  describe('Transaction', () => {
    it('transactWrite commits multiple puts atomically', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const items: any[] = []
      for (let i = 0; i < 3; i++) {
        const attrs = createFakePost()
        const entity: any = { ...attrs, id: `txn-${i}` }
        Object.setPrototypeOf(entity, Post.prototype)
        items.push(repository.buildTransactPut(entity))
      }

      await connection.transactWrite(items)

      const found0 = await repository.findOne({ hash: 'all', range: 'txn-0' })
      const found1 = await repository.findOne({ hash: 'all', range: 'txn-1' })
      const found2 = await repository.findOne({ hash: 'all', range: 'txn-2' })

      expect(found0).toBeDefined()
      expect(found1).toBeDefined()
      expect(found2).toBeDefined()
    })

    it('transactWrite rolls back on condition failure', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({ ...createFakePost(), content: 'original' })

      const newEntity: any = { pk: 'all', id: 'new-item', userId: 'u', content: 'c', enable: true, createdAt: 0 }
      Object.setPrototypeOf(newEntity, Post.prototype)

      const items = [
        repository.buildTransactPut(newEntity),
        repository.buildTransactPut(post, F.notExists('pk')),
      ]

      await expect(connection.transactWrite(items)).rejects.toThrow()

      const notFound = await repository.findOne({ hash: 'all', range: 'new-item' })
      expect(notFound).toBeUndefined()
    })

    it('transactWrite with delete', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post1 = await repository.create(createFakePost())
      await delay(10)
      const post2 = await repository.create(createFakePost())

      const newEntity: any = { pk: 'all', id: 'replacement', userId: 'u', content: 'c', enable: true, createdAt: 0 }
      Object.setPrototypeOf(newEntity, Post.prototype)

      await connection.transactWrite([
        repository.buildTransactDelete(post1),
        repository.buildTransactPut(newEntity),
      ])

      expect(await repository.findOne({ hash: 'all', range: post1.id })).toBeUndefined()
      expect(await repository.findOne({ hash: 'all', range: 'replacement' })).toBeDefined()
      expect(await repository.findOne({ hash: 'all', range: post2.id })).toBeDefined()
    })
  })


  describe('Upsert', () => {
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
