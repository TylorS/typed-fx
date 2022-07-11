import { contains } from 'hkt-ts/Array'

import { DependencyMap } from './DependencyMap'
import { DiGraph } from './DiGraph'
import { getDependencies } from './getDependencies'
import { toDependencyMap } from './toDependencyMap'

export function getDescendants<A>(vertice: A) {
  return (
    graph: DiGraph<A>,
    dependencyMap: DependencyMap<A> = toDependencyMap(graph),
  ): ReadonlyArray<A> => {
    const toVisit = [...getDependencies(vertice)(graph, dependencyMap)]
    const dependencies: A[] = []
    const elem = contains(graph)

    for (const a of toVisit) {
      if (!elem(a)(dependencies)) {
        dependencies.push(a)
        toVisit.push(
          ...getDependencies(a)(graph, dependencyMap).filter((x) => !graph.equals(x, vertice)),
        )
      }
    }

    return dependencies
  }
}
