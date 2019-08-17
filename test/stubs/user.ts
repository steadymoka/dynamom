import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "users"})
export class User {

  @HashKey()
  @GeneratedValue({strategy: "uuid"})
  @Column({name: "user_id"})
  public id!: string

  @RangeKey()
  @Column()
  public username!: string

  @Index({name: "index__email"})
  @Column()
  public email!: string

  @Column({name: "type_tt"})
  public type!: string

  @Index({ rangeKey: "user_id" })
  @Column({name: "created_at"})
  public createdAt!: number
  
}
