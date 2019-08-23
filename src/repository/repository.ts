import { DeepPartial, Transformer } from "relater"
import { Connection } from "../connection/connection"
import { DynamoCursor } from "../interfaces/connection"
import { RepositoryOptions, RetrieveOptions, RetrieveResult } from "../interfaces/repository"
import { columnBy } from "../indexer/column-by"
import uuid from "uuid/v4"
import kuuid from "kuuid"

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

  public async create(attrs: DeepPartial<Entity>): Promise<Entity> {
    const entity: any = { ...attrs }
    Object.setPrototypeOf(entity, this.options.ctor.prototype)
    const node = this.transformer.toPlain(entity as Entity)

    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === "uuid") {
        node[generatedValue.sourceKey] = uuid()
      }
      if (generatedValue.strategy === "kuuid") {
        node[generatedValue.sourceKey] = kuuid.idms()
      }
    }
    for (const index of this.options.indexes) {
      if (index.hashKey.generated) {
        node[index.hashKey.generated.key] = `${columnBy<Entity>(index.hashKey.generated.properties as any)(entity)}}`
      }

      if (index.rangeKey && index.rangeKey.generated) {
        node[index.rangeKey.generated.key] = `${columnBy<Entity>(index.rangeKey.generated.properties as any)(entity)}__${new Date().getTime()}`
      }
    }

    const hashKey = node[this.options.hashKey.sourceKey]
    if (!hashKey) {
      throw new Error("hashKey not defined!")
    }

    await this.connection.putItems(this.options, [{
      cursor: {
        hashKey: node[this.options.hashKey.sourceKey],
        rangeKey: this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined,
      },
      node,
    }])
    return this.transformer.toEntity(node)
  }

  public async find(hashKey: string, rangeKey?: any): Promise<Entity | undefined> {
    const cursor = {
      hashKey,
      rangeKey
    }
    const node = await this.connection.getItem(this.options, cursor)
    if (node) {
      return this.transformer.toEntity(node)
    }
    return
  }

  public async retrieve({ indexName, hash, range, limit = 20, after, desc = false }: RetrieveOptions<Entity> = { hash: "all" }): Promise<RetrieveResult<Entity>> {
    let endCursor: DynamoCursor | undefined
    const nodes: {cursor: string, node: Entity}[] = []

    const result = await this.connection.query(this.options, {
      indexName,
      hash,
      range,
      limit,
      after: after ? decodeBase64(after) : undefined,
      desc,
    })
    endCursor = result.endCursor

    result.nodes.forEach(({ node, cursor }) => {
      nodes.push({
        node: this.transformer.toEntity(node),
        cursor: encodeBase64(cursor),
      })
    })

    if (endCursor) {
      return {
        nodes,
        endCursor: encodeBase64(endCursor),
      }  
    }
    return {
      nodes,
    }
  }

  public async persist(entity: Entity): Promise<void> {
    const hashKey = (entity as any)[this.options.hashKey.property]
    if (!hashKey) {
      throw new Error("hashKey not defined!")
    }
    const rangeKey = this.options.rangeKey 
      ? (entity as any)[this.options.rangeKey.property] 
      : undefined
    
    await this.connection.updateItem(this.options, {
      cursor: rangeKey
        ? {
          hashKey,
          rangeKey,
        }
        : {
          hashKey,
        },
      node: this.transformer.toPlain(entity as Entity)
    })
  }

  public async remove(entity: Entity): Promise<void> {
    const hashKey = (entity as any)[this.options.hashKey.property]
    if (!hashKey) {
      throw new Error("hashKey not defined!")
    }
    const rangeKey = this.options.rangeKey 
      ? (entity as any)[this.options.rangeKey.property] 
      : undefined
    await this.connection.deleteManyItems(this.options, [
      rangeKey
        ? {
          hashKey: hashKey,
          rangeKey: rangeKey,
        }
        : {
          hashKey: hashKey,
        },
    ])
  }

}
