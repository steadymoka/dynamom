import { Column, Index, Entity, GeneratedValue, HashKey, RangeKey } from '../../lib'


@Entity({name: 'users'})
@Index<User>({ hash: ['email'], range: [] })
@Index<User>({ hash: ['createdAt'], range: ['id'] })
export class User {

  @Column({name: 'user_id'})
  @HashKey() @GeneratedValue({strategy: 'uuid'})
  public id!: string

  @Column()
  @RangeKey()
  public username!: string

  @Column()
  public email!: string

  @Column({name: 'type_tt'})
  public type!: string

  @Column({name: 'created_at'})
  public createdAt!: number
  
}
