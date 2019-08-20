import { DeepPartial, Transformer } from "relater"
import { Connection } from "../connection/connection"
import { DynamoCursor } from "../interfaces/connection"
import { RepositoryOptions, RetrieveOptions, RetrieveResult } from "../interfaces/repository"
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
    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === "uuid") {
        entity[generatedValue.property] = uuid()
      }
      if (generatedValue.strategy === "kuuid") {
        entity[generatedValue.property] = kuuid.idms()
      }
    }
    for (const generatedIndex of this.options.generatedIndexes) {
      if (generatedIndex.indexHash) {
        entity[generatedIndex.property] = generatedIndex.indexHash
      }
      if (generatedIndex.targets) {
        entity[generatedIndex.property] = `${generatedIndex.targets!.map((item: any) => entity[`${item}`]).join("_")}_${new Date().getTime()}`
      }
    }
    Object.setPrototypeOf(entity, this.options.ctor.prototype)
    const hashKey = entity[this.options.hashKey.property]
    if (!hashKey) {
      throw new Error("hashKey not defined!")
    }

    await this.connection.putItems(this.options, [{
      cursor: {
        hashKey: entity[this.options.hashKey.property],
        rangeKey: this.options.rangeKey ? entity[this.options.rangeKey.property] : undefined,
      },
      node: this.transformer.toPlain(entity as Entity)
    }])
    return entity
  }

  public async find(hashKey: string, rangeKey?: any): Promise<Entity | undefined> {
    const cursor = {
      hashKey: hashKey,
      rangeKey: rangeKey
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
    await this.connection.putItems(this.options, [{
      cursor: this.options.rangeKey 
        ? {
          hashKey: (entity as any)[this.options.hashKey.property],
          rangeKey: (entity as any)[this.options.rangeKey.property],
        }
        : {
          hashKey: (entity as any)[this.options.hashKey.property],
        },
      node: this.transformer.toPlain(entity as Entity)
    }])
  }

  public async remove(entity: Entity): Promise<void> {
    const hashKey = (entity as any)[this.options.hashKey.property]
    if (!hashKey) {
      throw new Error("hashKey not defined!")
    }
    await this.connection.deleteManyItems(this.options, [
      this.options.rangeKey
        ? {
          hashKey: (entity as any)[this.options.hashKey.property],
          rangeKey: (entity as any)[this.options.rangeKey.property],
        }
        : {
          hashKey: (entity as any)[this.options.hashKey.property],
        },
    ])
  }

}
