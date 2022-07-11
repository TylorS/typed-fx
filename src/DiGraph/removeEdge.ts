import { tuple } from 'hkt-ts/Typeclass/Eq'

import { DiGraph, Edge } from './DiGraph'

export function removeEdge<A>(edge: Edge<A>, graph: DiGraph<A>): DiGraph<A> {
  const edgeEq = tuple(graph, graph)

  return {
    ...graph,
    edges: graph.edges.filter((e) => !edgeEq.equals(edge, e)),
  }
}
