import { Column, Index, Entity, GeneratedValue, HashKey } from '../../lib'


@Entity({ name: 'movies' })
@Index<Movie>({ hash: ['userId'], range: ['createdAt'] })
@Index<Movie>({ hash: ['indexKey'], range: ['userId', 'title'] })
export class Movie {

  @Column()
  @GeneratedValue({ strategy: 'kuuid' })
  @HashKey()
  public id!: string

  @Column({ name: 'user_id' })
  public userId!: string

  @Column()
  public title!: string

  @Column()
  public description!: string

  @Column({ name: 'index_key' })
  public indexKey!: string

  @Column({ name: 'created_at'})
  public createdAt!: number

}
