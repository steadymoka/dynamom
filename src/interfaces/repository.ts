import { Identifier, RelaterOptions } from "relater"

export interface RepositoryOptions<P> extends RelaterOptions<P> {
  name: string
  id: {
    property: Identifier
    sourceKey: string
  }
  generatedValues: {
    property: Identifier
    strategy: string
  }[]
}
