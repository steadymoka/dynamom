import { createOptions } from "../../lib/repository/create-options"
import { User } from "../stubs/user"


describe("testsuite of repository/create-options", () => {
  it("test createOptions of User", () => {
    expect(createOptions(User)).toEqual({
      name: "user",
      ctor: User,
      id: {
        property: "id",
        sourceKey: "user_id",
      },
      generatedValues: [
        {
          property: "id",
          strategy: "uuid",
        }
      ],
      indexes: [
        {
          name: "type",
          indexer: expect.any(Function),
        },
        {
          name: "created",
          indexer: expect.any(Function),
        },
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
          sourceKey: "type",
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
