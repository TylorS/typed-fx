import { flatten, uniq } from 'hkt-ts/Array'
import * as Eq from 'hkt-ts/Typeclass/Eq'
import { pipe } from 'hkt-ts/function'

export interface DiGraph<V> extends Eq.Eq<V> {
  readonly vertices: ReadonlyArray<V>
  readonly edges: Edges<V>
}

export type Edges<A> = ReadonlyArray<Edge<A>>

export type Edge<A> = readonly [from: A, to: A]

export function make<V>(edges: Edges<V>, eq: Eq.Eq<V> = Eq.DeepEquals): DiGraph<V> {
  return {
    ...eq,
    // Avoid creating duplicate vertices
    vertices: pipe(edges, flatten, uniq(eq)),
    edges,
  }
}
