import { Column, ColumnIndex, Entity, GeneratedValue, Id } from "../../src"


@Entity({name: "user"})
@ColumnIndex<User>("created", ["createdAt"])
export class User {

  @Id() @GeneratedValue({strategy: "uuid"})
  @Column({name: "user_id"})
  public id!: string

  @Column()
  public username!: string

  @Column()
  public email!: string

  @Column({name: "created_at"})
  public createdAt!: number
}
