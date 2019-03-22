import { DeepPartial, Transformer, MaybeArray } from "relater"
import { Connection } from "../connection/connection"
import { RepositoryOptions } from "../interfaces/repository"
import * as uuid from "uuid/v4"

export class Repository<Entity> {
  
  public transformer: Transformer<Entity>

  public constructor(public connection: Connection, public options: RepositoryOptions<Entity>) {
    this.transformer = new Transformer(options)
  }

  public async find(id: string): Promise<Entity | undefined> {
    const node = await this.connection.getItem(this.options.name, id)
    if (node) {
      node[this.options.id.sourceKey] = id
      return this.transformer.toEntity(node)
    }
    return
  }

  public async create(entity: DeepPartial<Entity>): Promise<Entity> {
    const node: any = {...entity}
    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === "uuid") {
        node[generatedValue.property] = uuid()
      }
    }
    Object.setPrototypeOf(node, this.options.ctor.prototype)
    const id = node[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }
    await this.connection.putItems([
      {
        hashKey: this.options.name,
        rangeKey: id,
        item: this.transformer.toPlain(entity),
      },
      // {
      //   hashKey: this.options.name + "_indexname",
      //   rangeKey: index,
      //   item: {sourceid: id},
      // },
    ])
    return node
  }

  public async persist(entity: Entity): Promise<Entity> {
    const id = (entity as any)[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }
    await this.connection.putItems([
      {
        hashKey: this.options.name,
        rangeKey: id,
        item: this.transformer.toPlain(entity),
      },
      // {
      //   hashKey: this.options.name + "_indexname",
      //   rangeKey: index,
      //   item: {sourceid: id},
      // },
    ])
    return entity
  }
}
