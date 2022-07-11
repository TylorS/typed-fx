import { uniq } from 'hkt-ts/Array'
import { pipe } from 'hkt-ts/function'

import { DiGraph } from './DiGraph'

export function addVertice<A>(vertice: A) {
  return (graph: DiGraph<A>): DiGraph<A> => ({
    ...graph,
    vertices: pipe([...graph.vertices, vertice], uniq(graph)),
  })
}
