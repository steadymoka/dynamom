import {
  Column,
  Entity,
  GeneratedValue,
  Id
} from "../../src"


@Entity({name: "user"})
export class User {

  @Id() @GeneratedValue()
  @Column({name: "user_id"})
  public id?: string

  @Column()
  public username!: string

  @Column()
  public email!: string

  @Column({name: "created_at"})
  public createdAt!: number
}
