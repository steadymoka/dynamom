import { Column, Entity, GeneratedValue, HashKey, RangeKey } from '../../lib'


@Entity({ name: 'users' })
export class UserWithHooks {

  @Column({ name: 'user_id' })
  @HashKey() @GeneratedValue({ strategy: 'uuid' })
  public id!: string

  @Column()
  @RangeKey()
  public username!: string

  @Column()
  public email!: string

  @Column<UserWithHooks>({
    name: 'full_label',
    onCreate: (entity) => `${entity.username}:${entity.email}`,
    onUpdate: (entity) => `${entity.username}:${entity.email}`,
  })
  public fullLabel!: string

  @Column<UserWithHooks>({
    name: 'created_at',
    onCreate: () => Date.now(),
  })
  public createdAt!: number

  @Column<UserWithHooks>({
    name: 'updated_at',
    onCreate: () => Date.now(),
    onUpdate: () => Date.now(),
  })
  public updatedAt!: number

}
