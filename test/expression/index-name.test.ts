import { getSafeConnection } from '../helper'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'


describe('Type-safe Index Name (repo.indexName)', () => {
  it('generates correct index name from property names', async () => {
    const connection = await getSafeConnection('posts')
    const repository = connection.getRepository(Post)

    // Post has @Index<Post>({ hash: ['userId'], range: ['id'] })
    // userId → user_id, id → id
    expect(repository.indexName('userId', 'id')).toBe('index__user_id__id')
  })

  it('generates hash-only index name', async () => {
    const connection = await getSafeConnection('users')
    const repository = connection.getRepository(User)

    // User has @Index<User>({ hash: ['email'], range: [] })
    expect(repository.indexName('email')).toBe('index__email')
  })
})
