import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from '../../lib'


@Entity({ name: 'posts' })
@Index<Post>({ hash: ['userId'], range: ['id'] })
export class Post {

  @Column()
  @HashKey()
  public pk!: string

  @Column()
  @RangeKey() @GeneratedValue({ strategy: 'kuuid' })
  public id!: string

  @Column({ name: 'user_id' })
  public userId!: string

  @Column()
  public content!: string

  @Column()
  public enable!: boolean

  @Column({ name: 'created_at' })
  public createdAt!: number

}
