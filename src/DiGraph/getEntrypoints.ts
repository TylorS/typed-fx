import * as RA from 'hkt-ts/Array'
import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'
import { pipe } from 'hkt-ts/function'

import { DependencyMap } from './DependencyMap'
import { DiGraph } from './DiGraph'
import { getStronglyConnectedComponents } from './getStronglyConnectedComponents'
import { removeVertice } from './removeVertice'
import { toDependencyMap } from './toDependencyMap'

export type Entrypoint<A> = AcyclicEntrypoint<A> | CyclicEntrypoint<A>

export type AcyclicEntrypoint<A> = {
  readonly type: 'acyclic'
  readonly vertice: A
}

export type CyclicEntrypoint<A> = {
  readonly type: 'cyclic'
  readonly vertices: ReadonlyArray<A>
}

export function getEntrypoints<A>(graph: DiGraph<A>): ReadonlyArray<Entrypoint<A>> {
  const depedencyMap = toDependencyMap(graph)
  const sccsList = getStronglyConnectedComponents(graph)
  const possibleEntrypoints = sccsList.map(toEntrypoint)

  return possibleEntrypoints.filter((possibility) => isEntrypoint(possibility, depedencyMap, graph))
}

function toEntrypoint<A>(sccs: NonEmptyArray<A>): Entrypoint<A> {
  if (sccs.length === 1) {
    return {
      type: 'acyclic',
      vertice: sccs[0],
    }
  }

  return {
    type: 'cyclic',
    vertices: sccs,
  }
}

function isEntrypoint<A>(
  entrypoint: Entrypoint<A>,
  map: DependencyMap<A>,
  graph: DiGraph<A>,
): boolean {
  if (entrypoint.type === 'acyclic') {
    return !pipe(Array.from(map.values()), RA.flatten, RA.contains(graph)(entrypoint.vertice))
  }

  for (const vertice of entrypoint.vertices) {
    const effectiveGraph = pipe(
      entrypoint.vertices,
      RA.filter((v) => !graph.equals(v, vertice)),
      RA.reduce(graph, (g, a) => removeVertice(a)(g)),
    )
    const effectiveDependencyMap = toDependencyMap(effectiveGraph)
    const asEntrypoint: Entrypoint<A> = {
      type: 'acyclic',
      vertice,
    }

    if (isEntrypoint(asEntrypoint, effectiveDependencyMap, effectiveGraph)) {
      return true
    }
  }

  return false
}
