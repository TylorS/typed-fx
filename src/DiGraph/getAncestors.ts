import { contains } from 'hkt-ts/Array'

import { DependencyMap } from './DependencyMap'
import { DiGraph } from './DiGraph'
import { getDependents } from './getDependents'
import { toDependentMap } from './toDependentMap'

export function getAncestors<A>(
  vertice: A,
  graph: DiGraph<A>,
  dependentMap: DependencyMap<A> = toDependentMap(graph),
): ReadonlyArray<A> {
  const toVisit = [...getDependents(vertice)(graph, dependentMap)]
  const anscestors: A[] = []
  const elem = contains(graph)

  for (const a of toVisit) {
    if (!elem(a)(anscestors)) {
      anscestors.push(a)
      toVisit.push(
        ...getDependents(a)(graph, dependentMap).filter((x) => !graph.equals(x, vertice)),
      )
    }
  }

  return anscestors
}
