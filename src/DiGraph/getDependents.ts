import { pipe } from 'hkt-ts'
import { lookup } from 'hkt-ts/Map'
import { getOrElse } from 'hkt-ts/Maybe'

import { DependentMap } from './DependentMap'
import { DiGraph } from './DiGraph'
import { toDependentMap } from './toDependentMap'

export function getDependents<A>(vertice: A) {
  return (
    graph: DiGraph<A>,
    // Possible to pass along DependentMap to speed things up
    dependents: DependentMap<A> = toDependentMap(graph),
  ): ReadonlyArray<A> => {
    return pipe(
      dependents,
      lookup(graph)(vertice),
      getOrElse((): ReadonlyArray<A> => []),
    )
  }
}
