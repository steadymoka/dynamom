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

  @Index("index__email", { rangeKeys: [] })
  @Column()
  public email!: string

  @Column({name: "type_tt"})
  public type!: string

  @Index("index__created_at", { rangeKeys: ["user_id"] })
  @Column({name: "created_at"})
  public createdAt!: number
  
}
