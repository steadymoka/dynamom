import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from "../../lib"


@Entity({name: "categories"})
export class Category {

  @Column({ name: "hashKey" })
  @HashKey()
  public pk!: number

  @Column()
  @GeneratedValue({ strategy: "kuuid" })
  @RangeKey()
  public id!: string

  @Column({ name: "user_id" })
  public userId!: string

  @Column()
  public title!: string

  @Column({ name: "created_at"})
  public createdAt!: number
  
}
