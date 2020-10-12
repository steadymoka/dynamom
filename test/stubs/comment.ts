import { Column, Index, Entity, HashKey, RangeKey } from '../../lib'


@Entity({name: 'comments'})
@Index({ hash: ['userId'], range: [] })
export class Comment {

  @Column()
  @HashKey()
  public pk!: number

  @Column()
  @RangeKey()
  public type!: number

  @Column({ name: 'user_id' })
  public userId!: string

  @Column()
  public content!: string

  @Column({ name: 'created_at'})
  public createdAt!: number
  
}
