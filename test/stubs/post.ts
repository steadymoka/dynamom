import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "posts"})
export class Post {

  @HashKey()
  @Column()
  public pk!: string

  @RangeKey()
  @GeneratedValue({ strategy: "uuid" })
  @Column()
  public id!: string

  @Index({ name: "index__user_id", rangeKey: "id" })
  @Column({ name: "user_id" })
  public userId!: string

  @Column()
  public content!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}
