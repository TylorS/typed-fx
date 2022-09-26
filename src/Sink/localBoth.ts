import { flow } from 'hkt-ts'

import { Sink, addTrace } from './Sink.js'

import { Cause } from '@/Cause/Cause.js'
import { Fx, flatMap } from '@/Fx/Fx.js'

export function localBoth<E1, E, B, A>(
  f: (cause: Cause<E1>) => Cause<E>,
  g: (b: B) => A,
  __trace?: string,
) {
  return <R2, E2>(sink: Sink<E, A, R2, E2>): Sink<E1, B, R2, E2> =>
    addTrace(
      {
        ...sink,
        error: flow(f, sink.error),
        event: flow(g, sink.event),
      },
      __trace,
    )
}
export function localBothFx<E1, R3, E3, E, B, R4, E4, A>(
  f: (cause: Cause<E1>) => Fx<R3, E3, Cause<E>>,
  g: (b: B) => Fx<R4, E4, A>,
  __trace?: string,
) {
  return <R2, E2>(sink: Sink<E, A, R2, E2>): Sink<E1, B, R2 | R3 | R4, E2 | E3 | E4> =>
    addTrace<E1, B, R2 | R3 | R4, E2 | E3 | E4>(
      {
        event: flow(g, flatMap(sink.event)),
        error: flow(f, flatMap(sink.error)),
        end: sink.end,
      },
      __trace,
    )
}
