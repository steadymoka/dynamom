import { DeepPartial, Transformer } from "relater"
import * as uuid from "uuid/v4"
import { Connection } from "../connection/connection"
import { DynamoCursor } from "../interfaces/connection"
import { RepositoryOptions, RetrieveOptions, RetrieveResult } from "../interfaces/repository"


function encodeBase64(cursor: DynamoCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64")
}

function decodeBase64(buffer: string): DynamoCursor {
  return JSON.parse(Buffer.from(buffer, "base64").toString("ascii"))
}

export class Repository<Entity> {
  
  public transformer: Transformer<Entity>

  public constructor(public connection: Connection, public options: RepositoryOptions<Entity>) {
    this.transformer = new Transformer(options)
  }

  public async retrieve({limit = 20, after}: RetrieveOptions = {}, byIndex?: string): Promise<RetrieveResult<Entity>> {
    const result = await this.connection.query(this.options.name, {
      limit,
      after: after ? decodeBase64(after) : undefined,
    })
    return {
      nodes: result.nodes.map(({node, cursor}) => {
        node[this.options.id.sourceKey] = cursor.rangeKey
        return {
          node: this.transformer.toEntity(node),
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

  public async find(id: string): Promise<Entity | undefined> {
    const node = await this.connection.getItem(this.options.name, id)
    if (node) {
      node[this.options.id.sourceKey] = id
      return this.transformer.toEntity(node)
    }
    return
  }

  public async create(attrs: DeepPartial<Entity>): Promise<Entity> {
    const entity: any = {...attrs}
    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === "uuid") {
        entity[generatedValue.property] = uuid()
      }
    }
    Object.setPrototypeOf(entity, this.options.ctor.prototype)
    const id = entity[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }
    await this.connection.putItems([
      {
        cursor: {
          hashKey: this.options.name,
          rangeKey: id,
        },
        node: this.transformer.toPlain(attrs),
      },
      ...this.options.indexes.map((index) => {
        return {
          cursor: {
            hashKey: `${this.options.name}__${index.name}`,
            rangeKey: index.indexer(entity),
          },
          node: {
            sourcetype: this.options.name,
            sourceid: id,
          },
        }
      }),
    ])
    return entity
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
      ...this.options.indexes.map((index) => {
        return {
          cursor: {
            hashKey: `${this.options.name}__${index.name}`,
            rangeKey: index.indexer(entity),
          },
          node: {
            sourcetype: this.options.name,
            sourceid: id,
          },
        }
      }),
    ])
  }

  public async remove(entity: Entity): Promise<void> {
    const id = (entity as any)[this.options.id.property]
    if (!id) {
      throw new Error("id not defined!")
    }

    await this.connection.deleteManyItems([
      {
        hashKey: this.options.name,
        rangeKey: id,
      },
      ...this.options.indexes.map((index) => {
        return {
          hashKey: `${this.options.name}__${index.name}`,
          rangeKey: index.indexer(entity),
        }
      }),
    ])
  }
}
