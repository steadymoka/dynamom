import { DeepPartial, Transformer } from "relater"
import * as uuid from "uuid/v4"
import { Connection } from "../connection/connection"
import { DynamoCursor } from "../interfaces/connection"
import { RepositoryOptions } from "../interfaces/repository"


function encodeBase64(cursor: DynamoCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64")
}

function decodeBase64(buffer: string): DynamoCursor {
  return JSON.parse(Buffer.from(buffer, "base64").toString("ascii"))
}

export class Repository<Entity> {
  
  public transformer: Transformer<Entity>

  public async retrieve(options: {limit?: number, after: string}, byIndex?: string) {
    const result = await this.connection.query(this.options.name, {
      limit: options.limit,
      after: options.after ? decodeBase64(options.after) : undefined,
    })
    return {
      nodes: result.nodes.map(({node, cursor}) => {
        return {
          node,
          cursor: encodeBase64(cursor),
        }
      }),
      endCursor: result.endCursor ? encodeBase64(result.endCursor) : undefined,
    }
  
    // const result2 = await this.client.batchGet({
    //   RequestItems: {
    //     [TableName]: {
    //       Keys: (result.Items || []).map((item) => ({id: item.targetid, range: "space"})),
    //     },
    //   },
    // }).promise()
  }

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
        cursor: {
          hashKey: this.options.name,
          rangeKey: id,
        },
        node: this.transformer.toPlain(entity),
      },
      // {
      //   hashKey: this.options.name + "_indexname",
      //   rangeKey: index,
      //   item: {sourceid: id},
      // },
    ])
    return node
  }

  public async persist(entity: Entity): Promise<void> {
    const id = (entity as any)[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }
    await this.connection.putItems([
      {
        cursor: {
          hashKey: this.options.name,
          rangeKey: id,
        },
        node: this.transformer.toPlain(entity),
      },
      // {
      //   hashKey: this.options.name + "_indexname",
      //   rangeKey: index,
      //   item: {sourceid: id},
      // },
    ])
  }

  public async remove(entity: Entity): Promise<void> {
    const id = (entity as any)[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }

    await this.connection.deleteItem(this.options.name, id)
  }
}
