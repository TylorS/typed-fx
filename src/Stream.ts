import * as Effect from '@effect/core/io/Effect'

import { Sink } from './Sink.js'

export interface Stream<R, E, A, E1 = never> {
  readonly run: <R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => Effect.Effect<R | R2, E1 | E2, B>
}

export function Stream<R, E, A, E1 = never>(run: Stream<R, E, A, E1>['run']): Stream<R, E, A, E1> {
  return { run }
}
