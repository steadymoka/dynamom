import { createOptions } from '../../lib/repository/create-options'
import { Repository } from '../../lib/repository/repository'
import { User } from '../stubs/user'


describe('Entity Mapping', () => {

  describe('toEntity / toPlain', () => {
    let repository: Repository<User>

    beforeAll(() => {
      const options = createOptions(User)
      repository = new Repository<User>(null as any, options)
    })

    it('toEntity: converts a DynamoDB row to Entity with correct property mapping', () => {
      const row = { user_id: 'abc', username: 'bob', email: 'b@b.com', type_tt: 'admin', created_at: 100 }
      const entity = repository.toEntity(row)

      expect(entity.id).toBe('abc')
      expect(entity.username).toBe('bob')
      expect(entity.email).toBe('b@b.com')
      expect(entity.type).toBe('admin')
      expect(entity.createdAt).toBe(100)
      expect(entity).toBeInstanceOf(User)
    })

    it('toEntity: converts array of rows', () => {
      const rows = [
        { user_id: 'a', username: 'u1', email: 'e1', type_tt: 't1', created_at: 1 },
        { user_id: 'b', username: 'u2', email: 'e2', type_tt: 't2', created_at: 2 },
      ]
      const entities = repository.toEntity(rows)

      expect(entities).toHaveLength(2)
      expect(entities[0]).toBeInstanceOf(User)
      expect(entities[1]).toBeInstanceOf(User)
      expect(entities[0].id).toBe('a')
      expect(entities[1].id).toBe('b')
    })

    it('toPlain: converts Entity to DynamoDB row with reverse mapping', () => {
      const row = { user_id: 'abc', username: 'bob', email: 'b@b.com', type_tt: 'admin', created_at: 100 }
      const entity = repository.toEntity(row)
      const plain = repository.toPlain(entity)

      expect(plain).toEqual(row)
    })

    it('toPlain: converts array of entities', () => {
      const rows = [
        { user_id: 'a', username: 'u1', email: 'e1', type_tt: 't1', created_at: 1 },
        { user_id: 'b', username: 'u2', email: 'e2', type_tt: 't2', created_at: 2 },
      ]
      const entities = repository.toEntity(rows)
      const plains = repository.toPlain(entities)

      expect(plains).toEqual(rows)
    })

    it('toEntity: ignores undefined fields in row', () => {
      const row = { user_id: 'abc', username: 'bob' }
      const entity = repository.toEntity(row)

      expect(entity.id).toBe('abc')
      expect(entity.username).toBe('bob')
      expect(entity.email).toBeUndefined()
    })

    it('roundtrip: toPlain(toEntity(row)) equals original row', () => {
      const row = { user_id: 'x', username: 'y', email: 'e', type_tt: 't', created_at: 999 }
      expect(repository.toPlain(repository.toEntity(row))).toEqual(row)
    })
  })

})
