import { createOptions } from '../../lib/repository/create-options'
import { Category } from '../stubs/category'
import { Comment } from '../stubs/comment'
import { Movie } from '../stubs/movie'
import { Post } from '../stubs/post'
import { User } from '../stubs/user'


describe('createOptions', () => {
  it('User (hash+range, uuid, 2 indexes)', () => {
    expect(createOptions(User)).toEqual({
      target: User,
      tableName: 'users',
      columns: [
        {
          property: 'id',
          name: 'user_id',
          onCreate: undefined,
          onUpdate: undefined,
          target: User,
        },
        {
          property: 'username',
          name: 'username',
          onCreate: undefined,
          onUpdate: undefined,
          target: User,
        },
        {
          property: 'email',
          name: 'email',
          onCreate: undefined,
          onUpdate: undefined,
          target: User,
        },
        {
          property: 'type',
          name: 'type_tt',
          onCreate: undefined,
          onUpdate: undefined,
          target: User,
        },
        {
          property: 'createdAt',
          name: 'created_at',
          onCreate: undefined,
          onUpdate: undefined,
          target: User,
        },
      ],
      generatedValues: [
        {
          property: 'id',
          sourceKey: 'user_id',
          strategy: 'uuid',
        },
      ],
      hashKey: {
        property: 'id',
        sourceKey: 'user_id',
      },
      rangeKey: {
        property: 'username',
        sourceKey: 'username',
      },
      indexes: [
        {
          name: 'index__created_at__user_id',
          hashKey: {
            property: 'createdAt',
            sourceKey: 'created_at',
            generated: undefined,
          },
          rangeKey: {
            property: 'id',
            sourceKey: 'user_id',
            generated: undefined,
          },
        },
        {
          name: 'index__email',
          hashKey: {
            property: 'email',
            sourceKey: 'email',
            generated: undefined,
          },
          rangeKey: undefined,
        },
      ],
    })
  })

  it('Post (hash+range, kuuid, 1 index)', () => {
    expect(createOptions(Post)).toEqual({
      target: Post,
      tableName: 'posts',
      columns: [
        {
          property: 'pk',
          name: 'pk',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'id',
          name: 'id',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'userId',
          name: 'user_id',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'content',
          name: 'content',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'enable',
          name: 'enable',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'createdAt',
          name: 'created_at',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'tags',
          name: 'tags',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
        {
          property: 'metadata',
          name: 'metadata',
          onCreate: undefined,
          onUpdate: undefined,
          target: Post,
        },
      ],
      generatedValues: [
        {
          property: 'id',
          sourceKey: 'id',
          strategy: 'kuuid',
        },
      ],
      hashKey: {
        property: 'pk',
        sourceKey: 'pk',
      },
      rangeKey: {
        property: 'id',
        sourceKey: 'id',
      },
      indexes: [
        {
          name: 'index__user_id__id',
          hashKey: {
            property: 'userId',
            sourceKey: 'user_id',
            generated: undefined,
          },
          rangeKey: {
            property: 'id',
            sourceKey: 'id',
            generated: undefined,
          },
        },
      ],
    })
  })

  it('Movie (hash only, kuuid, composite index)', () => {
    const options = createOptions(Movie)

    expect(options.target).toBe(Movie)
    expect(options.tableName).toBe('movies')
    expect(options.hashKey).toEqual({ property: 'id', sourceKey: 'id' })
    expect(options.rangeKey).toBeUndefined()
    expect(options.generatedValues).toEqual([
      { property: 'id', sourceKey: 'id', strategy: 'kuuid' },
    ])
    expect(options.columns).toHaveLength(6)

    // Decorators are applied bottom-up, so composite index comes first
    // index 0: hash=indexKey, range=userId+title (composite range key)
    expect(options.indexes[0]).toEqual({
      name: 'index__index_key__user_id__title',
      hashKey: {
        property: 'indexKey',
        sourceKey: 'index_key',
        generated: undefined,
      },
      rangeKey: {
        property: undefined,
        sourceKey: undefined,
        generated: {
          key: 'user_id__title',
          properties: ['userId', 'title'],
          sourceKeys: ['user_id', 'title'],
        },
      },
    })

    // index 1: hash=userId, range=createdAt (single keys)
    expect(options.indexes[1]).toEqual({
      name: 'index__user_id__created_at',
      hashKey: {
        property: 'userId',
        sourceKey: 'user_id',
        generated: undefined,
      },
      rangeKey: {
        property: 'createdAt',
        sourceKey: 'created_at',
        generated: undefined,
      },
    })
  })

  it('Category (NUMBER hash, kuuid range)', () => {
    const options = createOptions(Category)

    expect(options.target).toBe(Category)
    expect(options.tableName).toBe('categories')
    expect(options.hashKey).toEqual({ property: 'pk', sourceKey: 'hashKey' })
    expect(options.rangeKey).toEqual({ property: 'id', sourceKey: 'id' })
    expect(options.generatedValues).toEqual([
      { property: 'id', sourceKey: 'id', strategy: 'kuuid' },
    ])
    expect(options.indexes).toEqual([])
  })

  it('Comment (NUMBER hash+range, index)', () => {
    const options = createOptions(Comment)

    expect(options.target).toBe(Comment)
    expect(options.tableName).toBe('comments')
    expect(options.hashKey).toEqual({ property: 'pk', sourceKey: 'pk' })
    expect(options.rangeKey).toEqual({ property: 'type', sourceKey: 'type' })
    expect(options.generatedValues).toEqual([])
    expect(options.indexes).toHaveLength(1)
    expect(options.indexes[0].name).toBe('index__user_id')
  })

  it('throws for class without @Entity decorator', () => {
    class PlainClass {
      public value!: string
    }
    expect(() => createOptions(PlainClass)).toThrow('not defined entity')
  })
})
