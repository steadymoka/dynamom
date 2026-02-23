import { getSafeConnection, delay } from '../helper'
import { UserWithHooks } from '../stubs/user-with-hooks'


describe('Column Hooks (onCreate / onUpdate)', () => {

  describe('onCreate', () => {
    it('computes fullLabel from other properties on create', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)

      const user = await repository.create({
        username: 'moka',
        email: 'moka@test.com',
      })

      expect(user.fullLabel).toBe('moka:moka@test.com')
    })

    it('sets createdAt and updatedAt timestamps on create', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)
      const before = Date.now()

      const user = await repository.create({
        username: 'moka',
        email: 'moka@test.com',
      })

      expect(user.createdAt).toBeGreaterThanOrEqual(before)
      expect(user.updatedAt).toBeGreaterThanOrEqual(before)
    })

    it('persists computed values to DynamoDB', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)

      const user = await repository.create({
        username: 'moka',
        email: 'moka@test.com',
      })

      const found = await repository.findOne({ hash: user.id, range: user.username })

      expect(found!.fullLabel).toBe('moka:moka@test.com')
      expect(found!.createdAt).toBe(user.createdAt)
      expect(found!.updatedAt).toBe(user.updatedAt)
    })
  })


  describe('onUpdate', () => {
    it('recomputes fullLabel on persist', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)

      const user = await repository.create({
        username: 'moka',
        email: 'moka@test.com',
      })
      expect(user.fullLabel).toBe('moka:moka@test.com')

      user.email = 'new@test.com'
      await repository.persist(user)

      const found = await repository.findOne({ hash: user.id, range: user.username })
      expect(found!.fullLabel).toBe('moka:new@test.com')
    })

    it('updates updatedAt but preserves createdAt on persist', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)

      const user = await repository.create({
        username: 'moka',
        email: 'moka@test.com',
      })
      const originalCreatedAt = user.createdAt
      const originalUpdatedAt = user.updatedAt

      await delay(50)

      user.email = 'changed@test.com'
      await repository.persist(user)

      const found = await repository.findOne({ hash: user.id, range: user.username })
      // createdAt has no onUpdate → should be unchanged
      expect(found!.createdAt).toBe(originalCreatedAt)
      // updatedAt has onUpdate → should be newer
      expect(found!.updatedAt).toBeGreaterThan(originalUpdatedAt)
    })
  })


  describe('upsert', () => {
    it('runs onCreate hooks on upsert', async () => {
      const connection = await getSafeConnection('users')
      const repository = connection.getRepository(UserWithHooks)

      const user = await repository.upsert({
        username: 'moka',
        email: 'moka@test.com',
      })

      expect(user.fullLabel).toBe('moka:moka@test.com')
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()

      const found = await repository.findOne({ hash: user.id, range: user.username })
      expect(found!.fullLabel).toBe('moka:moka@test.com')
    })
  })

})
