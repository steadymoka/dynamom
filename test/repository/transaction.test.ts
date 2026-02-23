import { F } from '../../lib'
import { getSafeConnection, delay } from '../helper'
import { Post } from '../stubs/post'
import { createFakePost } from '../stubs/create-faker'


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
