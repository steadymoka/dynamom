import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "comments"})
export class Comment {

  @HashKey()
  @Column()
  public pk!: number

  @RangeKey()
  @Column()
  public type!: number

  @Index()
  @Column({ name: "user_id" })
  public userId!: string

  @Column()
  public content!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}
