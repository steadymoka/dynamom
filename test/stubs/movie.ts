import { Column, Index, Entity, GeneratedValue, HashKey, GeneratedIndex } from "../../lib"


@Entity({name: "movies"})
export class Movie {

  @Column()
  @GeneratedValue({ strategy: "kuuid" })
  @HashKey()
  public id!: string

  @Column()
  @Index("index__user_id", { rangeKeys: ["created_at"] })
  public user_id!: string

  @Column()
  public title!: string

  @Column()
  public description!: string

  @Column({ name: "index_key" })
  @Index("index__user_id_title", { rangeKeys: ["user_id", "title"] })
  @GeneratedIndex({ indexHash: "all" })
  public indexKey!: string

  @Column()
  public user_id__title!: string
  
  @Column({ name: "created_at"})
  public createdAt!: number

}
