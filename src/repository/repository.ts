import { Key } from 'aws-sdk/clients/dynamodb'
import kuuid from 'kuuid'
import { v4 as uuid } from 'uuid'

import { Connection } from '../connection/connection'
import { columnBy } from '../indexer/column-by'
import { MaybeArray } from '../interfaces/common'
import { DynamoCursor } from '../interfaces/connection'
import { DefaultRange } from '../interfaces/range'
import { CountOptions, RepositoryOptions, RetrieveOptions, RetrieveResult } from '../interfaces/repository'

function encodeBase64(cursor: Key): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

function decodeBase64(buffer: string): Key {
  return JSON.parse(Buffer.from(buffer, 'base64').toString('ascii'))
}

export class Repository<Entity extends object> {

  constructor(
    public connection: Connection,
    public options: RepositoryOptions<Entity>,
  ) {
  }

  toEntity(rows: any[]): Entity[]
  toEntity(rows: any): Entity
  toEntity(rows: MaybeArray<any>): MaybeArray<Entity> {
    if (!Array.isArray(rows)) {
      return this.toEntity([rows])[0]
    }
    return rows.map((row: any) => {
      const entity: any = {}
      for (const column of this.options.columns) {
        if (row[column.name]) {
          entity[column.property] = row[column.name]
        }
      }

      Object.setPrototypeOf(entity, this.options.target.prototype)
      return entity
    })
  }

  toPlain(entities: Entity[]): any[]
  toPlain(entities: Entity): any
  toPlain(entities: Partial<Entity>[]): any[]
  toPlain(entities: Partial<Entity>): any
  toPlain(entities: any): MaybeArray<any> {
    if (!Array.isArray(entities)) {
      return this.toPlain([entities] as Entity[])[0]
    }
    return entities.map((entity) => {
      const row: any = {}
      for (const column of this.options.columns) {
        if (entity[column.property]) {
          row[column.name] = entity[column.property]
        }
      }
      return row
    })
  }

  public async create(attrs: Partial<Entity>): Promise<Entity> {
    const entity: any = { ...attrs }
    Object.setPrototypeOf(entity, this.options.target.prototype)
    const node = this.toPlain(entity as Entity)

    for (const generatedValue of this.options.generatedValues) {
      if (generatedValue.strategy === 'uuid') {
        node[generatedValue.sourceKey] = uuid()
      }
      if (generatedValue.strategy === 'kuuid') {
        node[generatedValue.sourceKey] = kuuid.idms()
      }
    }
    for (const index of this.options.indexes) {
      if (index.hashKey.generated) {
        node[index.hashKey.generated.key] = `${columnBy<Entity>(index.hashKey.generated.properties as any)(entity)}`
      }
      if (index.rangeKey && index.rangeKey.generated) {
        node[index.rangeKey.generated.key] = `${columnBy<Entity>(index.rangeKey.generated.properties as any)(entity)}__${new Date().getTime()}`
      }
    }

    const hashKey = node[this.options.hashKey.sourceKey]
    if (!hashKey) {
      throw new Error('hashKey not defined!')
    }

    await this.connection.putItems(this.options, [{
      cursor: {
        hash: node[this.options.hashKey.sourceKey],
        range: this.options.rangeKey ? node[this.options.rangeKey.sourceKey] : undefined,
      },
      node,
    }])
    return this.toEntity(node)
  }

  public async findOne({ indexName, hash, range }: { indexName?: string, hash: string | number, range?: string | number }): Promise<Entity | undefined> {
    if (!indexName) {
      if (this.options.rangeKey && !range) {
        return (await this.retrieve({ hash, limit: 1 })).nodes[0]
      }
      const cursor = {
        hash,
        range,
      }
      const node = await this.connection.getItem(this.options, cursor)
      if (node) {
        return this.toEntity(node)
      }
      return undefined
    }
    return (await this.retrieve({ indexName, hash, rangeOption: range ? new DefaultRange(range) : undefined, limit: 1 })).nodes[0]
  }

  public async findOnes(cursors: DynamoCursor[]): Promise<Entity[] | undefined> {
    const nodes = await this.connection.getManyItems(this.options, cursors)
    if (nodes) {
      return this.toEntity(nodes)
    }
    return undefined
  }

  public async count({ indexName, hash }: CountOptions): Promise<number> {
    if (!hash) {
      return Promise.resolve(0)
    }
    return await this.connection.count(this.options, indexName, hash)
  }

  public async retrieve({ indexName, hash, rangeOption, limit = 20, after, desc = false }: RetrieveOptions<Entity> = { hash: 'all' }): Promise<RetrieveResult<Entity>> {
    const nodes: Entity[] = []

    const result = await this.connection.query(this.options, {
      indexName,
      hash,
      rangeOption,
      limit,
      after: after ? decodeBase64(after) : undefined,
      desc,
    })
    const endCursor = result.endCursor

    result.nodes.forEach((node) => {
      nodes.push(this.toEntity(node))
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
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined

    await this.connection.updateItem(this.options, {
      cursor: range
        ? {
          hash,
          range,
        }
        : {
          hash,
        },
      node: this.toPlain(entity),
    })
  }

  public async remove(entity: Entity): Promise<void> {
    const hash = (entity as any)[this.options.hashKey.property]
    if (!hash) {
      throw new Error('hashKey not defined!')
    }
    const range = this.options.rangeKey
      ? (entity as any)[this.options.rangeKey.property]
      : undefined
    await this.connection.deleteManyItems(this.options, [
      range
        ? {
          hash,
          range,
        }
        : {
          hash,
        },
    ])
  }

}
