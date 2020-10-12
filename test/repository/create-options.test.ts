import { createOptions } from '../../lib/repository/create-options'
import { User } from '../stubs/user'
import { Post } from '../stubs/post'


describe('testsuite of repository/create-options', () => {
  it('test createOptions of User', () => {
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
        }
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

  it('test createOptions of posts', () => {
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
          property: 'createdAt',
          name: 'created_at',
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
        }
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
            generated: undefined
          },
          rangeKey: {
            property: 'id',
            sourceKey: 'id',
            generated: undefined,
          }
        },
      ],
    })
  })
})
