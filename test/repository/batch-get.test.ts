import { getSafeConnection, getMultiTableConnection, createSequential } from '../helper'
import { Comment } from '../stubs/comment'
import { User } from '../stubs/user'
import {
  createFakeComment,
  createFakeUser,
} from '../stubs/create-faker'


describe('batchGet', () => {

  describe('multi-table', () => {
    it('batch retrieves from multiple tables in parallel', async () => {
      const connection = await getMultiTableConnection('users', 'comments')
      const userRepo = connection.getRepository(User)
      const commentRepo = connection.getRepository(Comment)

      const users = await createSequential(3, () => userRepo.create(createFakeUser()))
      const comments = await createSequential(2, () => commentRepo.create(createFakeComment()))

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: users.map(u => ({ hash: u.id, range: u.username })),
        },
        comments: {
          entity: Comment,
          keys: comments.map(c => ({ hash: c.pk, range: c.type })),
        },
      })

      expect(result.users).toHaveLength(3)
      expect(result.comments).toHaveLength(2)

      for (const user of users) {
        expect(result.users.find(u => u.id === user.id)).toBeDefined()
      }
      for (const comment of comments) {
        expect(result.comments.find(c => c.pk === comment.pk && c.type === comment.type)).toBeDefined()
      }
    })

    it('handles empty keys for some labels', async () => {
      const connection = await getMultiTableConnection('users', 'comments')
      const userRepo = connection.getRepository(User)

      const users = await createSequential(2, () => userRepo.create(createFakeUser()))

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: users.map(u => ({ hash: u.id, range: u.username })),
        },
        comments: {
          entity: Comment,
          keys: [],
        },
      })

      expect(result.users).toHaveLength(2)
      expect(result.comments).toHaveLength(0)
    })

    it('returns empty arrays when all keys are empty', async () => {
      const connection = await getMultiTableConnection('users', 'comments')

      const result = await connection.batchGet({
        users: { entity: User, keys: [] },
        comments: { entity: Comment, keys: [] },
      })

      expect(result.users).toHaveLength(0)
      expect(result.comments).toHaveLength(0)
    })
  })

  describe('single-table', () => {
    it('works as a convenient single-table batch get', async () => {
      const connection = await getSafeConnection('users')
      const userRepo = connection.getRepository(User)

      const users = await createSequential(5, () => userRepo.create(createFakeUser()))

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: users.map(u => ({ hash: u.id, range: u.username })),
        },
      })

      expect(result.users).toHaveLength(5)
      for (const user of users) {
        expect(result.users.find(u => u.id === user.id)).toBeDefined()
      }
    })
  })

  describe('entity transformation', () => {
    it('correctly maps column names to entity properties', async () => {
      const connection = await getMultiTableConnection('users', 'comments')
      const userRepo = connection.getRepository(User)
      const commentRepo = connection.getRepository(Comment)

      const fakeUser = createFakeUser()
      const user = await userRepo.create(fakeUser)
      const fakeComment = createFakeComment()
      const comment = await commentRepo.create(fakeComment)

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: [{ hash: user.id, range: user.username }],
        },
        comments: {
          entity: Comment,
          keys: [{ hash: comment.pk, range: comment.type }],
        },
      })

      // User: column 'user_id' → property 'id', column 'type_tt' → property 'type'
      expect(result.users[0].id).toBe(user.id)
      expect(result.users[0].email).toBe(fakeUser.email)
      expect(result.users[0].type).toBe(fakeUser.type)

      // Comment: column 'user_id' → property 'userId'
      expect(result.comments[0].pk).toBe(comment.pk)
      expect(result.comments[0].userId).toBe(fakeComment.userId)
      expect(result.comments[0].content).toBe(fakeComment.content)
    })
  })

  describe('consistent read', () => {
    it('supports consistent read per request', async () => {
      const connection = await getMultiTableConnection('users', 'comments')
      const userRepo = connection.getRepository(User)
      const commentRepo = connection.getRepository(Comment)

      const user = await userRepo.create(createFakeUser())
      const comment = await commentRepo.create(createFakeComment())

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: [{ hash: user.id, range: user.username }],
          consistent: true,
        },
        comments: {
          entity: Comment,
          keys: [{ hash: comment.pk, range: comment.type }],
          consistent: true,
        },
      })

      expect(result.users).toHaveLength(1)
      expect(result.comments).toHaveLength(1)
    })
  })

  describe('auto-chunking', () => {
    it('handles more than 100 keys by auto-chunking', async () => {
      const connection = await getSafeConnection('comments')
      const commentRepo = connection.getRepository(Comment)

      const count = 110
      const comments: Comment[] = []
      for (let i = 0; i < count; i++) {
        comments.push(await commentRepo.create({
          pk: 1,
          type: i + 1,
          userId: `user-${i}`,
          content: `content-${i}`,
          createdAt: Date.now(),
        }))
      }

      const result = await connection.batchGet({
        comments: {
          entity: Comment,
          keys: comments.map(c => ({ hash: c.pk, range: c.type })),
        },
      })

      expect(result.comments).toHaveLength(count)
      for (const comment of comments) {
        expect(result.comments.find(c => c.pk === comment.pk && c.type === comment.type)).toBeDefined()
      }
    }, 30000)
  })

  describe('non-existent keys', () => {
    it('skips keys that do not exist', async () => {
      const connection = await getSafeConnection('users')
      const userRepo = connection.getRepository(User)

      const user = await userRepo.create(createFakeUser())

      const result = await connection.batchGet({
        users: {
          entity: User,
          keys: [
            { hash: user.id, range: user.username },
            { hash: 'non-existent-id', range: 'nobody' },
          ],
        },
      })

      expect(result.users).toHaveLength(1)
      expect(result.users[0].id).toBe(user.id)
    })
  })

})
