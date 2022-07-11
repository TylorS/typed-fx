import { pipe } from 'hkt-ts'
import { lookup } from 'hkt-ts/Map'
import { getOrElse } from 'hkt-ts/Maybe'

import { DependencyMap } from './DependencyMap'
import { DiGraph } from './DiGraph'
import { toDependencyMap } from './toDependencyMap'

export function getDependencies<A>(vertice: A) {
  return (
    graph: DiGraph<A>,
    dependencies: DependencyMap<A> = toDependencyMap(graph),
  ): ReadonlyArray<A> => {
    return pipe(
      dependencies,
      lookup(graph)(vertice),
      getOrElse((): ReadonlyArray<A> => []),
    )
  }
}
