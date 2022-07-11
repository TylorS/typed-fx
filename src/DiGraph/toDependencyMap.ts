import * as A from 'hkt-ts/Array'
import * as M from 'hkt-ts/Map'
import { getOrElse } from 'hkt-ts/Maybe'
import { Eq } from 'hkt-ts/Typeclass/Eq'
import { pipe } from 'hkt-ts/function'

import { DependencyMap } from './DependencyMap'
import { DiGraph, Edge } from './DiGraph'

export function toDependencyMap<A>(graph: DiGraph<A>, eq: Eq<A> = graph): DependencyMap<A> {
  return pipe(graph.edges, A.reduce(new Map<A, ReadonlyArray<A>>(), applyEdge(eq)))
}

function applyEdge<A>(eq: Eq<A>) {
  const lookup = M.lookup(eq)
  const upsertAt = M.upsertAt(eq)

  return (map: DependencyMap<A>, edge: Edge<A>): DependencyMap<A> => {
    const [from, to] = edge

    return pipe(
      map,
      upsertAt(
        from,
        pipe(
          map,
          lookup(from),
          getOrElse((): readonly A[] => []),
          A.append(to),
          A.uniq(eq),
        ),
      ),
    )
  }
}
