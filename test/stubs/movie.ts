import { Column, Index, Entity, GeneratedValue, HashKey, GeneratedIndex } from "../../lib"


@Entity({name: "movies"})
export class Movie {

  @Column()
  @GeneratedValue({ strategy: "kuuid" })
  @HashKey()
  public id!: string

  @Column()
  @Index({ name: "index__user_id", rangeKey: "created_at" })
  public user_id!: string

  @Column()
  public title!: string

  @Column()
  public description!: string

  @Column({ name: "index_key" })
  @Index({ name: "index__user_id_title", rangeKey: "user_id__title" })
  @GeneratedIndex({ indexHash: "all" })
  public indexKey!: string

  @Column({ name: "user_id__title" })
  @GeneratedIndex({ targets: ["user_id", "title"] })
  public userId_title!: string

  @Column({ name: "created_at"})
  public createdAt!: number

}
