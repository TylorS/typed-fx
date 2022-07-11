import { uniq } from 'hkt-ts/Array'
import { tuple } from 'hkt-ts/Typeclass/Eq'
import { pipe } from 'hkt-ts/function'

import { DiGraph, Edge, make } from './DiGraph'

export function addEdge<A>(edge: Edge<A>) {
  return (graph: DiGraph<A>): DiGraph<A> => {
    return make(pipe([...graph.edges, edge], uniq(tuple<readonly [A, A]>(graph, graph))), graph)
  }
}
