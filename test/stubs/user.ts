import { Column, Index, Entity, GeneratedValue, Id, columnBy } from "../../lib"


@Entity({name: "user"})
@Index<User>("created", columnBy(["createdAt"]))
@Index<User>("type", columnBy(["type"]))
export class User {

  @Id() @GeneratedValue({strategy: "uuid"})
  @Column({name: "user_id"})
  public id!: string

  @Column()
  public username!: string

  @Column()
  public email!: string

  @Column({name: "type_tt"})
  public type!: string

  @Column({name: "created_at"})
  public createdAt!: number
  
}
