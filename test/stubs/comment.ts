import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "comments"})
export class Comment {

  @Column()
  @HashKey()
  public pk!: number

  @Column()
  @RangeKey()
  public type!: number

  @Column({ name: "user_id" })
  @Index("index__user_id", { rangeKeys: [] })
  public userId!: string

  @Column()
  public content!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}
