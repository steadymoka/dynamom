import {
  BiggerThanRange,
  DefaultRange,
  SmallerThanRange,
  GteRange,
  LteRange,
  BeginsWithRange,
  BetweenRange,
  F,
} from '../../lib'
import { getSafeConnection, delay, createSequential, encodeBase64 } from '../helper'
import { Category } from '../stubs/category'
import { Comment } from '../stubs/comment'
import { Movie } from '../stubs/movie'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'
import {
  createFakeCategory,
  createFakeComment,
  createFakeMovie,
  createFakePost,
  createFakeUser,
} from '../stubs/create-faker'


describe('Query & Scan', () => {

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

    it('works with repo.indexName for actual query', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await delay(10)
      await repository.create(createFakePost('moka'))
      await delay(10)
      await repository.create(createFakePost('moka'))
      await delay(10)
      await repository.create(createFakePost('other'))

      const result = await repository.retrieve({
        indexName: repository.indexName('userId', 'id'),
        hash: 'moka',
      })

      expect(result.nodes).toHaveLength(2)
      for (const node of result.nodes) {
        expect(node.userId).toBe('moka')
      }
    })
  })


  describe('scan', () => {
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

})
