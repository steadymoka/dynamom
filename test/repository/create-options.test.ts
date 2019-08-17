import { createOptions } from "../../lib/repository/create-options"
import { User } from "../stubs/user"
import { Post } from "../stubs/post";


describe("testsuite of repository/create-options", () => {
  it("test createOptions of User", () => {
    expect(createOptions(User)).toEqual({
      tableName: "users",
      ctor: User,
      generatedValues: [
        {
          property: "id",
          strategy: "uuid",
        }
      ],
      hashKey: {
        property: "id",
        sourceKey: "user_id",
      },
      rangeKey: {
        property: "username",
        sourceKey: "username",
      },
      indexes: [
        {
          name: "index__email",
          hashKey: "email",
        },
        {
          name: "index__createdAt",
          hashKey: "created_at",
          rangeKey: "user_id"
        }
      ],
      columns: [
        {
          property: "id",
          sourceKey: "user_id",
          type: "string",
        },
        {
          property: "username",
          sourceKey: "username",
          type: "string",
        },
        {
          property: "email",
          sourceKey: "email",
          type: "string",
        },
        {
          property: "type",
          sourceKey: "type_tt",
          type: "string",
        },
        {
          property: "createdAt",
          sourceKey: "created_at",
          type: "string",
        },
      ],
      relations: [],
    })
  })

  it("test createOptions of posts", () => {
    expect(createOptions(Post)).toEqual({
      tableName: "posts",
      ctor: Post,
      generatedValues: [
        {
          property: "id",
          strategy: "uuid",
        }
      ],
      hashKey: {
        property: "pk",
        sourceKey: "pk",
      },
      rangeKey: {
        property: "id",
        sourceKey: "id",
      },
      indexes: [
        {
          name: "index__user_id",
          hashKey: "user_id",
          rangeKey: "id"
        },
      ],
      columns: [
        {
          property: "pk",
          sourceKey: "pk",
          type: "string",
        },
        {
          property: "id",
          sourceKey: "id",
          type: "string",
        },
        {
          property: "userId",
          sourceKey: "user_id",
          type: "string",
        },
        {
          property: "content",
          sourceKey: "content",
          type: "string",
        },
        {
          property: "createdAt",
          sourceKey: "created_at",
          type: "string",
        },
      ],
      relations: [],
    })
  })
})
