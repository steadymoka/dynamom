import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "posts"})
export class Post {

  @Column()
  @HashKey()
  public pk!: string

  @Column()
  @GeneratedValue({ strategy: "kuuid" })
  @RangeKey()
  public id!: string

  @Column({ name: "user_id" })
  @Index("index__user_id", { rangeKeys: ["id"] })
  public userId!: string

  @Column()
  public content!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}