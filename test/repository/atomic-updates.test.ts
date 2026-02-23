import { getSafeConnection, delay } from '../helper'
import { Comment } from '../stubs/comment'
import { Post } from '../stubs/post'
import {
  createFakeComment,
  createFakePost,
} from '../stubs/create-faker'


describe('Atomic Updates', () => {

  describe('increment', () => {
    it('atomically increases a numeric attribute', async () => {
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

    it('increments with default amount of 1', async () => {
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
  })


  describe('removeAttributes', () => {
    it('removes specified attributes', async () => {
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


  describe('Set Type (SS/NS)', () => {
    it('creates and retrieves entity with Set<string> (SS)', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({
        ...createFakePost(),
        tags: new Set(['typescript', 'dynamodb']),
      })

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.tags).toBeInstanceOf(Set)
      expect(found!.tags).toEqual(new Set(['typescript', 'dynamodb']))
    })

    it('addToSet atomically adds elements to a Set', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({
        ...createFakePost(),
        tags: new Set(['a', 'b']),
      })

      await repository.addToSet(post, 'tags', new Set(['c', 'd']))

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.tags).toBeInstanceOf(Set)
      expect(found!.tags).toEqual(new Set(['a', 'b', 'c', 'd']))
    })

    it('addToSet creates attribute when it does not exist', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const { tags: _tags, ...attrsWithoutTags } = createFakePost()
      const post = await repository.create(attrsWithoutTags as any)

      await repository.addToSet(post, 'tags', new Set(['new-tag']))

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.tags).toBeInstanceOf(Set)
      expect(found!.tags).toEqual(new Set(['new-tag']))
    })

    it('deleteFromSet atomically removes elements from a Set', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      const post = await repository.create({
        ...createFakePost(),
        tags: new Set(['x', 'y', 'z']),
      })

      await repository.deleteFromSet(post, 'tags', new Set(['y']))

      const found = await repository.findOne({ hash: post.pk, range: post.id })
      expect(found!.tags).toBeInstanceOf(Set)
      expect(found!.tags).toEqual(new Set(['x', 'z']))
    })
  })


  describe('appendToList', () => {
    it('appends items to an existing list', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create({
        ...createFakeComment(),
        history: ['a', 'b'],
      })

      await repository.appendToList(comment, 'history', ['c', 'd'])

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.history).toEqual(['a', 'b', 'c', 'd'])
    })

    it('creates list when attribute does not exist', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create(createFakeComment())

      await repository.appendToList(comment, 'history', ['first'])

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.history).toEqual(['first'])
    })

    it('with prepend inserts at the beginning', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create({
        ...createFakeComment(),
        history: ['b', 'c'],
      })

      await repository.appendToList(comment, 'history', ['a'], true)

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.history).toEqual(['a', 'b', 'c'])
    })
  })


  describe('setIfNotExists', () => {
    it('sets value only when attribute is missing', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create(createFakeComment())

      await repository.setIfNotExists(comment, 'history', ['default'] as any)

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.history).toEqual(['default'])
    })

    it('does NOT overwrite existing value', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create({
        ...createFakeComment(),
        history: ['existing'],
      })

      await repository.setIfNotExists(comment, 'history', ['should-not-appear'] as any)

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.history).toEqual(['existing'])
    })

    it('works with non-array types', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)
      const comment = await repository.create(createFakeComment())

      await repository.setIfNotExists(comment, 'content', 'fallback')

      const found = await repository.findOne({ hash: comment.pk, range: comment.type })
      expect(found!.content).toBe(comment.content)
    })
  })

})
