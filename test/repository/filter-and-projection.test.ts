import { BiggerThanRange, F } from '../../lib'
import { getSafeConnection, delay, createSequential } from '../helper'
import { Comment } from '../stubs/comment'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'
import {
  createFakeComment,
  createFakePost,
  createFakeUser,
} from '../stubs/create-faker'


describe('Filter & Projection', () => {

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


  describe('Type-safe Filter (repo.filter)', () => {
    it('repo.filter.eq applies property-to-column mapping', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      for (let i = 0; i < 5; i++) {
        await delay(10)
        await repository.create({ ...createFakePost('moka'), enable: i < 3 })
      }

      const result = await repository.retrieve({
        hash: 'all',
        filter: repository.filter.eq('enable', true),
      })

      expect(result.nodes).toHaveLength(3)
      for (const node of result.nodes) {
        expect(node.enable).toBe(true)
      }
    })

    it('repo.filter.and combines typed conditions', async () => {
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
        filter: repository.filter.and(
          repository.filter.eq('content', 'hello'),
          repository.filter.eq('enable', true),
        ),
      })

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].content).toBe('hello')
      expect(result.nodes[0].enable).toBe(true)
    })

    it('repo.filter maps userId property to user_id column', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await delay(10)
      await repository.create(createFakePost('alice'))
      await delay(10)
      await repository.create(createFakePost('bob'))
      await delay(10)
      await repository.create(createFakePost('alice'))

      const result = await repository.retrieve({
        hash: 'all',
        filter: repository.filter.eq('userId', 'alice'),
      })

      expect(result.nodes).toHaveLength(2)
      for (const node of result.nodes) {
        expect(node.userId).toBe('alice')
      }
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

})
