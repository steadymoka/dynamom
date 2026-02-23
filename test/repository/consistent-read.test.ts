import { getSafeConnection, delay, createSequential } from '../helper'
import { Comment } from '../stubs/comment'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'
import {
  createFakeComment,
  createFakePost,
  createFakeUser,
} from '../stubs/create-faker'


describe('ConsistentRead', () => {

  describe('findOne', () => {
    it('reads with consistent: true', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)
      const user = await repository.create(createFakeUser())

      const found = await repository.findOne({ hash: user.id, range: user.username, consistent: true })

      expect(found).toEqual(user)
    })

    it('reads with consistent: false (default behavior)', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)
      const user = await repository.create(createFakeUser())

      const found = await repository.findOne({ hash: user.id, range: user.username })

      expect(found).toEqual(user)
    })
  })


  describe('findOnes', () => {
    it('batch reads with consistent: true', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      const users = await createSequential(3, () => repository.create(createFakeUser()))
      const cursors = users.map(({ id, username }) => ({ hash: id, range: username }))

      const found = await repository.findOnes(cursors, { consistent: true })

      expect(found).toHaveLength(3)
    })
  })


  describe('retrieve', () => {
    it('queries with consistent: true', async () => {
      const connection = await getSafeConnection('comments')
      const repository = connection.getRepository(Comment)

      await createSequential(3, () => repository.create(createFakeComment()))

      const result = await repository.retrieve({ hash: 1, consistent: true })

      expect(result.nodes).toHaveLength(3)
    })
  })


  describe('scan', () => {
    it('scans with consistent: true', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(User)

      await createSequential(3, () => repository.create(createFakeUser()))

      const result = await repository.scan({ consistent: true })

      expect(result.nodes).toHaveLength(3)
    })
  })


  describe('count', () => {
    it('counts with consistent: true', async () => {
      const connection = await getSafeConnection('posts')
      const repository = connection.getRepository(Post)

      await createSequential(3, () => repository.create(createFakePost()))

      const count = await repository.count({ hash: 'all', consistent: true })

      expect(count).toBe(3)
    })
  })

})
