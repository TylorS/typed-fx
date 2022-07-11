import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { DependencyMap } from './DependencyMap'
import { DiGraph, make } from './DiGraph'

export function fromDependencyMap<A>(map: DependencyMap<A>, eq: Eq<A> = DeepEquals): DiGraph<A> {
  return make(
    Array.from(map).flatMap(([from, deps]) => deps.map((dep) => [from, dep])),
    eq,
  )
}
