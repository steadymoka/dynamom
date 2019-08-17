import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "categories"})
export class Category {

  @HashKey()
  @Column({ name: "hashKey" })
  public pk!: number

  @RangeKey()
  @GeneratedValue({ strategy: "uuid" })
  @Column()
  public id!: string

  @Index()
  @Column({ name: "user_id" })
  public userId!: string

  @Column()
  public title!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}
