import { swap } from 'hkt-ts/Tuple'
import { Eq } from 'hkt-ts/Typeclass/Eq'

import { DependentMap } from './DependentMap'
import { DiGraph } from './DiGraph'
import { toDependencyMap } from './toDependencyMap'

export function toDependentMap<A>(graph: DiGraph<A>, eq: Eq<A> = graph): DependentMap<A> {
  return toDependencyMap({ ...graph, edges: graph.edges.map(swap) }, eq)
}
