import { F } from '../../lib'
import { getSafeConnection } from '../helper'
import { Movie } from '../stubs/movie'
import { Post } from '../stubs/post'
import {
  createFakeMovie,
  createFakePost,
} from '../stubs/create-faker'


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
